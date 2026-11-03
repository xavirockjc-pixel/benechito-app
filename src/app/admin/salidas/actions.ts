"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * Registra una SALIDA de stock con su motivo (ej: "-20 Tú y Yo · Sra Checa",
 * "-10 Pack postre · Don Alex", "-5 Tú y Yo · al local"). Descuenta del stock de la
 * ubicación elegida (por defecto bodega) y queda el movimiento con el motivo.
 */
export async function registrarSalida(formData: FormData) {
  const productoId = String(formData.get("productoId") ?? "").trim();
  const cantidad = Math.floor(Number(String(formData.get("cantidad") ?? "").replace(/[^0-9]/g, "")) || 0);
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  let ubicacionId = String(formData.get("ubicacionId") ?? "").trim() || null;
  if (!productoId || cantidad <= 0) return;

  if (!ubicacionId) {
    ubicacionId = (await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } }))?.id
      ?? (await prisma.ubicacion.findFirst())?.id ?? null;
  }
  if (!ubicacionId) return;

  await prisma.stock.upsert({
    where: { productoId_ubicacionId: { productoId, ubicacionId } },
    update: { cantidad: { decrement: cantidad } },
    create: { productoId, ubicacionId, cantidad: -cantidad },
  });
  await prisma.movimientoStock.create({
    data: { productoId, tipo: "venta", ubicacionOrigenId: ubicacionId, cantidad, motivo },
  });

  revalidatePath("/admin/salidas");
  revalidatePath("/admin/inventario");
  redirect("/admin/salidas?ok=1");
}

/** Deshace una salida: devuelve el stock a su ubicación y borra el movimiento. */
export async function borrarSalida(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const mov = await prisma.movimientoStock.findUnique({ where: { id } });
  if (mov?.ubicacionOrigenId) {
    await prisma.stock.update({
      where: { productoId_ubicacionId: { productoId: mov.productoId, ubicacionId: mov.ubicacionOrigenId } },
      data: { cantidad: { increment: mov.cantidad } },
    }).catch(() => {});
  }
  await prisma.movimientoStock.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/salidas");
  revalidatePath("/admin/inventario");
}
