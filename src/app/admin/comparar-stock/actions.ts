"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { ubicacionBodegaId, ubicacionProduccionId } from "@/lib/dominio/ubicaciones";

function revalidar() {
  revalidatePath("/admin/comparar-stock");
  revalidatePath("/bodega");
  revalidatePath("/bodega/recibir");
}

/**
 * Arranca BODEGA desde cero DEVOLVIENDO todo a Producción: baja todo el stock de
 * bodega (sabores + productos) y lo deja como pendiente en Producción, para que
 * el bodeguero lo "pase" (reciba) ordenado. Nada se borra; queda el registro.
 */
export async function devolverBodegaAProduccion() {
  const bodUb = await ubicacionBodegaId();
  const prodUb = await ubicacionProduccionId();
  if (!bodUb || !prodUb) return;
  const u = await usuarioActual();

  const [sab, prod] = await Promise.all([
    prisma.stockSabor.findMany({ where: { ubicacionId: bodUb, cantidad: { gt: 0 } }, include: { sabor: { select: { nombre: true } } } }),
    prisma.stock.findMany({ where: { ubicacionId: bodUb, cantidad: { gt: 0 } }, include: { producto: { select: { nombre: true } } } }),
  ]);
  for (const f of sab) {
    await prisma.stockSabor.update({ where: { id: f.id }, data: { cantidad: 0 } });
    await prisma.stockSabor.upsert({ where: { saborId_ubicacionId: { saborId: f.saborId, ubicacionId: prodUb } }, update: { cantidad: { increment: f.cantidad } }, create: { saborId: f.saborId, ubicacionId: prodUb, cantidad: f.cantidad } });
    await prisma.movimientoBodega.create({ data: { zona: "produccion", ubicacionId: prodUb, tipo: "entrada", clase: "sabor", refId: f.saborId, nombre: f.sabor.nombre, cantidad: f.cantidad, detalle: "Devuelto de bodega (arrancar desde cero)", usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null } });
  }
  for (const f of prod) {
    await prisma.stock.update({ where: { id: f.id }, data: { cantidad: 0 } });
    await prisma.stock.upsert({ where: { productoId_ubicacionId: { productoId: f.productoId, ubicacionId: prodUb } }, update: { cantidad: { increment: f.cantidad } }, create: { productoId: f.productoId, ubicacionId: prodUb, cantidad: f.cantidad } });
    await prisma.movimientoBodega.create({ data: { zona: "produccion", ubicacionId: prodUb, tipo: "entrada", clase: "producto", refId: f.productoId, nombre: f.producto.nombre, cantidad: f.cantidad, detalle: "Devuelto de bodega (arrancar desde cero)", usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null } });
  }
  revalidar();
}

/**
 * Arranca BODEGA desde cero VACIÁNDOLA: deja todo el stock de bodega en 0 (sin
 * mandarlo a producción). Útil cuando los números estaban mal y quieres partir
 * limpio y que el bodeguero reciba desde producción lo que haya. Deja registro.
 */
export async function vaciarBodegaCero() {
  const bodUb = await ubicacionBodegaId();
  if (!bodUb) return;
  const u = await usuarioActual();
  const [sab, prod] = await Promise.all([
    prisma.stockSabor.findMany({ where: { ubicacionId: bodUb, cantidad: { not: 0 } }, include: { sabor: { select: { nombre: true } } } }),
    prisma.stock.findMany({ where: { ubicacionId: bodUb, cantidad: { not: 0 } }, include: { producto: { select: { nombre: true } } } }),
  ]);
  for (const f of sab) {
    await prisma.stockSabor.update({ where: { id: f.id }, data: { cantidad: 0 } });
    await prisma.movimientoBodega.create({ data: { zona: "bodega", ubicacionId: bodUb, tipo: "ajuste", clase: "sabor", refId: f.saborId, nombre: f.sabor.nombre, cantidad: -f.cantidad, detalle: "Bodega a 0 (arrancar desde cero)", usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null } });
  }
  for (const f of prod) {
    await prisma.stock.update({ where: { id: f.id }, data: { cantidad: 0 } });
    await prisma.movimientoBodega.create({ data: { zona: "bodega", ubicacionId: bodUb, tipo: "ajuste", clase: "producto", refId: f.productoId, nombre: f.producto.nombre, cantidad: -f.cantidad, detalle: "Bodega a 0 (arrancar desde cero)", usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null } });
  }
  revalidar();
}

/**
 * Pone en 0 un ítem en una ubicación (producción o bodega) para cuadrar: cuando
 * algo quedó colgado (ej. se vendió directo y nunca llegó a bodega). Deja registro.
 */
export async function cuadrarItem(formData: FormData) {
  const clase = String(formData.get("clase") ?? "");
  const refId = String(formData.get("refId") ?? "").trim();
  const donde = String(formData.get("donde") ?? "") === "bodega" ? "bodega" : "produccion";
  if (!refId || (clase !== "sab" && clase !== "prod")) return;
  const ubId = donde === "bodega" ? await ubicacionBodegaId() : await ubicacionProduccionId();
  if (!ubId) return;
  const u = await usuarioActual();

  if (clase === "sab") {
    const row = await prisma.stockSabor.findUnique({ where: { saborId_ubicacionId: { saborId: refId, ubicacionId: ubId } } });
    if (!row || row.cantidad === 0) return;
    await prisma.stockSabor.update({ where: { id: row.id }, data: { cantidad: 0 } });
    const s = await prisma.sabor.findUnique({ where: { id: refId }, select: { nombre: true } });
    await prisma.movimientoBodega.create({ data: { zona: donde, ubicacionId: ubId, tipo: "ajuste", clase: "sabor", refId, nombre: s?.nombre ?? "—", cantidad: -row.cantidad, detalle: "Cuadrado a 0 (comparador)", usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null } });
  } else {
    const row = await prisma.stock.findUnique({ where: { productoId_ubicacionId: { productoId: refId, ubicacionId: ubId } } });
    if (!row || row.cantidad === 0) return;
    await prisma.stock.update({ where: { id: row.id }, data: { cantidad: 0 } });
    const p = await prisma.producto.findUnique({ where: { id: refId }, select: { nombre: true } });
    await prisma.movimientoBodega.create({ data: { zona: donde, ubicacionId: ubId, tipo: "ajuste", clase: "producto", refId, nombre: p?.nombre ?? "—", cantidad: -row.cantidad, detalle: "Cuadrado a 0 (comparador)", usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null } });
  }
  revalidar();
}
