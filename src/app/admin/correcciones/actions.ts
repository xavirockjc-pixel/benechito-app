"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { revertirStockOP } from "../produccion/actions";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function refrescar() {
  revalidatePath("/admin/correcciones");
  revalidatePath("/admin/ventas");
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/panorama");
}

/** Deshace una venta: devuelve el stock y borra la venta (con sus pagos y documento). */
export async function deshacerVenta(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  const venta = await prisma.venta.findUnique({ where: { id }, select: { id: true, total: true } });
  if (!venta) return;

  const movs = await prisma.movimientoStock.findMany({ where: { referencia: id, tipo: "venta" } });
  for (const m of movs) {
    if (!m.ubicacionOrigenId) continue;
    await prisma.stock.upsert({
      where: { productoId_ubicacionId: { productoId: m.productoId, ubicacionId: m.ubicacionOrigenId } },
      update: { cantidad: { increment: m.cantidad } },
      create: { productoId: m.productoId, ubicacionId: m.ubicacionOrigenId, cantidad: m.cantidad },
    });
  }
  await prisma.movimientoStock.deleteMany({ where: { referencia: id } });
  await prisma.auditoria.create({ data: { accion: "deshacer", entidad: "Venta", entidadId: id, detalle: JSON.stringify({ total: Number(venta.total), lineas: movs.length }) } });
  await prisma.venta.delete({ where: { id } });
  refrescar();
}

/** Deshace una orden de producción: revierte el stock ingresado y borra la orden. */
export async function deshacerOP(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await revertirStockOP(id);
  await prisma.auditoria.create({ data: { accion: "deshacer", entidad: "OrdenProduccion", entidadId: id, detalle: "" } });
  await prisma.ordenProduccion.delete({ where: { id } });
  refrescar();
}

/** Deshace un gasto registrado. */
export async function deshacerGasto(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.gasto.delete({ where: { id } });
  refrescar();
}

/** Deshace un pago/movimiento al equipo. */
export async function deshacerPagoEquipo(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.movimientoTrabajador.delete({ where: { id } });
  refrescar();
}
