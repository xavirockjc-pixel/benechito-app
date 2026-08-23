"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { estadoPagoDe, MEDIOS_PAGO } from "@/lib/dominio/ventas";

/** Recalcula y guarda el estado de pago de una venta según sus abonos. */
async function recalcularEstadoPago(ventaId: string) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: { pagos: true },
  });
  if (!venta) return;
  const pagado = venta.pagos.reduce((s, p) => s + Number(p.monto), 0);
  const estado = estadoPagoDe(Number(venta.total), pagado);
  await prisma.venta.update({ where: { id: ventaId }, data: { estadoPago: estado } });
}

/**
 * Genera una VENTA a partir de un pedido: calcula el total desde sus líneas y la asocia
 * a una ubicación (la sala de ventas por defecto). No duplica si el pedido ya tiene venta.
 */
export async function generarVenta(formData: FormData) {
  const pedidoId = String(formData.get("pedidoId") ?? "").trim();
  if (!pedidoId) return;

  const pedido = await prisma.pedido.findUnique({
    where: { id: pedidoId },
    include: { items: true, venta: true },
  });
  if (!pedido || pedido.items.length === 0) return;
  if (pedido.venta) redirect(`/admin/ventas/${pedido.venta.id}`);

  const total = pedido.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0);

  // Ubicación por defecto: primera "sala", si no la primera que exista.
  const ubicacion =
    (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } })) ??
    (await prisma.ubicacion.findFirst());
  if (!ubicacion) return; // no hay ubicaciones configuradas

  const venta = await prisma.venta.create({
    data: {
      pedidoId: pedido.id,
      negocioId: pedido.negocioId,
      ubicacionId: ubicacion.id,
      total,
      estadoPago: "pendiente",
    },
  });

  revalidatePath("/admin/ventas");
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  redirect(`/admin/ventas/${venta.id}`);
}

/** Registra un abono (pago) a una venta y recalcula el estado de pago. */
export async function registrarPago(formData: FormData) {
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  const medio = String(formData.get("medio") ?? "").trim();
  const monto = Number(String(formData.get("monto") ?? "").trim().replace(",", "."));
  if (!ventaId || !(MEDIOS_PAGO as readonly string[]).includes(medio)) return;
  if (!Number.isFinite(monto) || monto <= 0) return;

  await prisma.pago.create({ data: { ventaId, medio, monto } });
  await recalcularEstadoPago(ventaId);

  revalidatePath(`/admin/ventas/${ventaId}`);
  revalidatePath("/admin/ventas");
}

/** Elimina un abono y recalcula el estado de pago. */
export async function eliminarPago(formData: FormData) {
  const pagoId = String(formData.get("pagoId") ?? "").trim();
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  if (!pagoId) return;

  await prisma.pago.delete({ where: { id: pagoId } });
  await recalcularEstadoPago(ventaId);

  revalidatePath(`/admin/ventas/${ventaId}`);
  revalidatePath("/admin/ventas");
}

/** Asigna el tipo de documento tributario a la venta (boleta/factura/ninguno). */
export async function asignarDocumento(formData: FormData) {
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  const documento = String(formData.get("documento") ?? "").trim() || null;
  if (!ventaId) return;
  await prisma.venta.update({ where: { id: ventaId }, data: { documento } });
  revalidatePath(`/admin/ventas/${ventaId}`);
}

/**
 * Elimina/deshace una venta: REPONE el stock que había descontado, borra sus
 * movimientos y la venta (pagos en cascada), y lo deja en auditoría. Para corregir
 * errores o limpiar pruebas. El pedido, si existía, queda sin venta asociada.
 */
export async function eliminarVenta(formData: FormData) {
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  const volverALista = String(formData.get("volver") ?? "") === "lista";
  if (!ventaId) return;

  const venta = await prisma.venta.findUnique({ where: { id: ventaId }, select: { id: true, total: true } });
  if (!venta) return;

  // Repone el stock que la venta había descontado (movimientos tipo "venta").
  const movs = await prisma.movimientoStock.findMany({ where: { referencia: ventaId, tipo: "venta" } });
  for (const m of movs) {
    if (!m.ubicacionOrigenId) continue;
    await prisma.stock.upsert({
      where: { productoId_ubicacionId: { productoId: m.productoId, ubicacionId: m.ubicacionOrigenId } },
      update: { cantidad: { increment: m.cantidad } },
      create: { productoId: m.productoId, ubicacionId: m.ubicacionOrigenId, cantidad: m.cantidad },
    });
  }
  await prisma.movimientoStock.deleteMany({ where: { referencia: ventaId } });

  await prisma.auditoria.create({
    data: {
      accion: "eliminar",
      entidad: "Venta",
      entidadId: ventaId,
      detalle: JSON.stringify({ total: Number(venta.total), lineasRepuestas: movs.length }),
    },
  });

  await prisma.venta.delete({ where: { id: ventaId } });

  revalidatePath("/admin/ventas");
  revalidatePath("/admin/inventario");
  if (!volverALista) redirect("/admin/ventas");
}
