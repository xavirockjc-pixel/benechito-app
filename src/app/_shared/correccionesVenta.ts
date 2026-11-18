"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { ROLES_FULL } from "@/lib/dominio/permisos";
import { MEDIOS_PAGO } from "@/lib/dominio/ventas";

export type ResultadoCorreccion = { ok: boolean; error?: string };

/** ¿El PIN coincide con la clave del dueño? (si no hay clave configurada, nadie pasa). */
async function pinValido(pin: string): Promise<boolean> {
  const emp = await prisma.empresa.findFirst({ select: { cajaPin: true } });
  const clave = (emp?.cajaPin ?? "").trim();
  return clave.length > 0 && clave === pin.trim();
}

function revalidar(ventaId: string) {
  revalidatePath("/caja");
  revalidatePath("/admin/registro-dia");
  revalidatePath("/admin/ventas");
  revalidatePath(`/admin/ventas/${ventaId}`);
  revalidatePath("/admin");
}

/**
 * Anula una venta (corrección de error): repone el stock que descontó, borra su
 * documento tributario y movimientos, deja auditoría y elimina la venta.
 * Requiere el PIN del dueño.
 */
export async function anularVentaConPin(formData: FormData): Promise<ResultadoCorreccion> {
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  if (!ventaId) return { ok: false, error: "Falta la venta." };
  if (!(await pinValido(pin))) return { ok: false, error: "Clave incorrecta." };

  const venta = await prisma.venta.findUnique({ where: { id: ventaId }, select: { id: true, total: true } });
  if (!venta) return { ok: false, error: "La venta ya no existe." };

  const u = await usuarioActual();

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
  // Borra el documento tributario asociado (si lo hubiera) para poder eliminar la venta.
  await prisma.documentoVenta.deleteMany({ where: { ventaId } });

  await prisma.auditoria.create({
    data: {
      accion: "anular",
      entidad: "Venta",
      entidadId: ventaId,
      detalle: JSON.stringify({ total: Number(venta.total), lineasRepuestas: movs.length, por: u?.nombre ?? u?.sub ?? "?" }),
    },
  }).catch(() => {});

  await prisma.venta.delete({ where: { id: ventaId } });

  revalidar(ventaId);
  return { ok: true };
}

/**
 * Cambia el medio de pago de una venta (ej: se marcó efectivo y era débito).
 * Actualiza todos sus abonos. Requiere el PIN del dueño.
 */
export async function cambiarMedioConPin(formData: FormData): Promise<ResultadoCorreccion> {
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const medio = String(formData.get("medio") ?? "").trim();
  if (!ventaId) return { ok: false, error: "Falta la venta." };
  if (!(MEDIOS_PAGO as readonly string[]).includes(medio)) return { ok: false, error: "Medio inválido." };
  if (!(await pinValido(pin))) return { ok: false, error: "Clave incorrecta." };

  const venta = await prisma.venta.findUnique({ where: { id: ventaId }, select: { id: true, pagos: { select: { id: true } } } });
  if (!venta) return { ok: false, error: "La venta ya no existe." };

  const u = await usuarioActual();
  if (venta.pagos.length > 0) {
    await prisma.pago.updateMany({ where: { ventaId }, data: { medio } });
  } else {
    // Venta sin abono registrado: crea uno con el total y el medio elegido.
    const v = await prisma.venta.findUnique({ where: { id: ventaId }, select: { total: true } });
    await prisma.pago.create({ data: { ventaId, medio, monto: Number(v?.total ?? 0) } });
  }

  await prisma.auditoria.create({
    data: { accion: "editar", entidad: "Venta", entidadId: ventaId, detalle: JSON.stringify({ campo: "medio", medio, por: u?.nombre ?? u?.sub ?? "?" }) },
  }).catch(() => {});

  revalidar(ventaId);
  return { ok: true };
}

/** El dueño configura/cambia la clave de correcciones (PIN). Solo roles full. */
export async function guardarCajaPin(formData: FormData): Promise<ResultadoCorreccion> {
  const u = await usuarioActual();
  if (!ROLES_FULL.includes(u?.rol ?? "")) return { ok: false, error: "Solo el dueño puede cambiar la clave." };
  const pin = String(formData.get("pin") ?? "").replace(/\D/g, "").slice(0, 8);
  if (pin.length < 4) return { ok: false, error: "La clave debe tener al menos 4 dígitos." };
  const emp = await prisma.empresa.findFirst({ select: { id: true } });
  if (!emp) return { ok: false, error: "No hay empresa configurada." };
  await prisma.empresa.update({ where: { id: emp.id }, data: { cajaPin: pin } });
  revalidatePath("/admin/registro-dia");
  return { ok: true };
}
