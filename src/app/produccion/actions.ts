"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { borrarCookieSesion, usuarioActual } from "@/lib/auth";

/** Cierra la sesión. */
export async function logout() {
  await borrarCookieSesion();
  redirect("/login");
}

async function bodegaId(): Promise<string | null> {
  const b = await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } });
  return b?.id ?? null;
}

/**
 * Control de calidad: confirma la mezcla tiqueando los insumos de la receta que se
 * echaron. Descuenta de la base de insumos SOLO los tiqueados (cantidad de la receta
 * × unidades a producir) y deja el consumo registrado. Evita descontar dos veces
 * porque el descuento va únicamente por aquí (no automático al registrar producción).
 */
export async function confirmarMezcla(formData: FormData) {
  const unidades = Number(String(formData.get("cantidad") ?? "").trim());
  const linea = String(formData.get("linea") ?? "").trim() || null;
  const sabor = String(formData.get("sabor") ?? "").trim() || null;
  const formato = String(formData.get("formato") ?? "").trim() || null;
  const total = Number(String(formData.get("total") ?? "0").trim()) || 0;
  const turno = String(formData.get("turno") ?? "").trim() || null;
  const operarios = String(formData.get("operarios") ?? "").trim() || null;
  const observaciones = String(formData.get("observaciones") ?? "").trim() || null;
  const marcados = (formData.getAll("marcado") as string[]).map((s) => String(s)).filter(Boolean);

  // Agregados pesados: [{ materiaPrimaId, cantidad }] — cantidad = total usado (no por unidad).
  let agregados: { materiaPrimaId: string; cantidad: number }[] = [];
  try { agregados = JSON.parse(String(formData.get("agregados") ?? "[]")); } catch { agregados = []; }
  agregados = agregados.filter((a) => a.materiaPrimaId && Number.isFinite(a.cantidad) && a.cantidad > 0);

  if (!Number.isFinite(unidades) || unidades <= 0) return;
  if (marcados.length === 0 && agregados.length === 0) return;

  const u = await usuarioActual();
  const nombre = [sabor, linea].filter(Boolean).join(" · ") || "Mezcla";

  // Registro de control de calidad (historial de la central).
  const control = await prisma.controlCalidad.create({
    data: {
      turno, operarios, clase: "linea", refId: linea, nombre, cantidad: unidades,
      itemsMarcados: marcados.length, itemsTotal: total, observaciones,
      usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
    },
  });

  // Receta base: descuenta (cantidad por unidad × unidades) los insumos marcados.
  if (marcados.length > 0) {
    const items = await prisma.recetaItem.findMany({ where: { id: { in: marcados } } });
    for (const it of items) {
      const usar = it.cantidad * unidades;
      if (usar <= 0) continue;
      await prisma.materiaPrima.update({ where: { id: it.materiaPrimaId }, data: { stock: { decrement: usar } } });
      await prisma.movimientoMateria.create({
        data: {
          materiaPrimaId: it.materiaPrimaId, tipo: "consumo", cantidad: usar,
          motivo: `Base · ${nombre} · ${unidades} u.`,
          usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
        },
      });
    }
  }

  // Agregados: descuenta el peso usado (tal cual) y guarda el rendimiento.
  for (const ag of agregados) {
    const mp = await prisma.materiaPrima.findUnique({ where: { id: ag.materiaPrimaId }, select: { nombre: true, unidad: true } });
    if (!mp) continue;
    await prisma.materiaPrima.update({ where: { id: ag.materiaPrimaId }, data: { stock: { decrement: ag.cantidad } } });
    await prisma.movimientoMateria.create({
      data: {
        materiaPrimaId: ag.materiaPrimaId, tipo: "consumo", cantidad: ag.cantidad,
        motivo: `Agregado · ${nombre} · ${unidades} u.`,
        usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
      },
    });
    await prisma.agregadoUso.create({
      data: {
        controlId: control.id, materiaPrimaId: ag.materiaPrimaId, nombreInsumo: mp.nombre, unidad: mp.unidad,
        cantidad: ag.cantidad, linea, sabor, formato, unidadesProducidas: unidades,
        usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
      },
    });
  }

  revalidatePath("/produccion");
  revalidatePath("/admin/materias");
  revalidatePath("/admin/control-calidad");
  redirect("/produccion?mezcla=1");
}

type ItemProd = { saborId?: string; nombre: string; cantidad: number };

/**
 * Registra producción por TIPO (línea) + SABOR. Cada sabor producido entra al
 * stock de sabores de la bodega (StockSabor); si el sabor no existe, se crea.
 * Queda en el registro del día de Producción (zona "produccion").
 */
export async function registrarProduccion(formData: FormData) {
  const linea = String(formData.get("linea") ?? "").trim() || "otro";
  let items: ItemProd[] = [];
  try {
    items = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return;
  }
  items = items.filter((i) => i.nombre?.trim() && Number.isFinite(i.cantidad) && i.cantidad > 0);
  if (items.length === 0) return;

  const bod = await bodegaId();
  if (!bod) return;
  const u = await usuarioActual();

  for (const it of items) {
    let saborId = it.saborId?.trim();
    if (!saborId) {
      const existe = await prisma.sabor.findFirst({ where: { nombre: it.nombre.trim(), linea } });
      saborId = existe?.id ?? (await prisma.sabor.create({ data: { nombre: it.nombre.trim(), linea } })).id;
    }
    await prisma.stockSabor.upsert({
      where: { saborId_ubicacionId: { saborId, ubicacionId: bod } },
      update: { cantidad: { increment: it.cantidad } },
      create: { saborId, ubicacionId: bod, cantidad: it.cantidad },
    });
    await prisma.movimientoBodega.create({
      data: {
        zona: "produccion", ubicacionId: bod, tipo: "entrada", clase: "sabor",
        refId: saborId, nombre: `${it.nombre.trim()} (${linea})`, cantidad: it.cantidad,
        usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
      },
    });
  }

  revalidatePath("/produccion");
  redirect("/produccion?ok=1");
}

/**
 * El fabricante CUMPLE una orden de producción: registra la cantidad real (y merma),
 * la marca terminada e ingresa lo producido a bodega (sabor→StockSabor, producto→Stock).
 * Queda también en el registro del turno.
 */
export async function cumplirOrden(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const cantidadReal = Number(String(formData.get("cantidadReal") ?? "").trim());
  const mermaRaw = Number(String(formData.get("merma") ?? "0").trim());
  const merma = Number.isFinite(mermaRaw) ? Math.max(0, mermaRaw) : 0;
  if (!id || !Number.isFinite(cantidadReal) || cantidadReal < 0) return;

  const op = await prisma.ordenProduccion.findUnique({
    where: { id },
    include: { producto: { select: { nombre: true } }, sabor: { select: { nombre: true, linea: true } } },
  });
  if (!op || op.estado === "terminada") return;

  const bod = await bodegaId();
  const u = await usuarioActual();

  await prisma.ordenProduccion.update({
    where: { id },
    data: { cantidadReal, merma, estado: "terminada", fechaTermino: new Date(), ubicacionDestinoId: bod ?? null, responsable: op.responsable ?? u?.nombre ?? null },
  });

  if (bod && cantidadReal > 0) {
    if (op.saborId) {
      await prisma.stockSabor.upsert({
        where: { saborId_ubicacionId: { saborId: op.saborId, ubicacionId: bod } },
        update: { cantidad: { increment: cantidadReal } },
        create: { saborId: op.saborId, ubicacionId: bod, cantidad: cantidadReal },
      });
    } else if (op.productoId) {
      await prisma.stock.upsert({
        where: { productoId_ubicacionId: { productoId: op.productoId, ubicacionId: bod } },
        update: { cantidad: { increment: cantidadReal } },
        create: { productoId: op.productoId, ubicacionId: bod, cantidad: cantidadReal },
      });
      await prisma.movimientoStock.create({
        data: { productoId: op.productoId, tipo: "produccion", ubicacionDestinoId: bod, cantidad: cantidadReal, referencia: op.id },
      });
    }
    const nombre = op.saborId ? `${op.sabor?.nombre ?? ""} (${op.sabor?.linea ?? ""})` : op.producto?.nombre ?? "Producto";
    await prisma.movimientoBodega.create({
      data: {
        zona: "produccion", ubicacionId: bod, tipo: "entrada", clase: op.saborId ? "sabor" : "producto",
        refId: op.saborId ?? op.productoId ?? id, nombre, cantidad: cantidadReal,
        usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
      },
    });
  }

  revalidatePath("/produccion");
  redirect("/produccion?ok=1");
}

/** El fabricante ENVÍA el reporte del turno: deja constancia (auditoría) de lo producido hoy. */
export async function enviarReporteTurno() {
  const u = await usuarioActual();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const movs = await prisma.movimientoBodega.findMany({ where: { fecha: { gte: hoy }, zona: "produccion" } });
  const total = movs.reduce((s, m) => s + m.cantidad, 0);
  const detalle = JSON.stringify({
    total,
    items: movs.map((m) => ({ nombre: m.nombre, cantidad: m.cantidad })),
  });

  await prisma.auditoria.create({
    data: { usuarioId: u?.sub ?? null, accion: "reporte_turno", entidad: "Produccion", detalle },
  });

  revalidatePath("/produccion");
  redirect("/produccion?reporte=1");
}
