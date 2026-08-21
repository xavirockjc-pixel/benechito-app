"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { estadoPagoDe, MEDIOS_PAGO } from "@/lib/dominio/ventas";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Number(val(fd, k).replace(",", "."));

/** Registra un gasto (egreso). */
export async function registrarGasto(formData: FormData) {
  const concepto = val(formData, "concepto");
  const monto = num(formData, "monto");
  if (!concepto || !Number.isFinite(monto) || monto <= 0) return;

  const fechaStr = val(formData, "fecha");
  await prisma.gasto.create({
    data: {
      concepto,
      monto,
      categoria: val(formData, "categoria") || null,
      fecha: fechaStr ? new Date(fechaStr) : new Date(),
      notas: val(formData, "notas") || null,
    },
  });
  revalidatePath("/admin/finanzas");
}

/** Elimina un gasto. */
export async function eliminarGasto(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.gasto.delete({ where: { id } });
  revalidatePath("/admin/finanzas");
}

/**
 * Abona a la deuda de un cliente: reparte el monto entre sus ventas pendientes,
 * de la más antigua a la más nueva (FIFO), y recalcula el estado de pago de cada una.
 */
export async function abonarDeuda(formData: FormData) {
  const negocioId = val(formData, "negocioId");
  const medio = val(formData, "medio");
  let monto = num(formData, "monto");
  if (!negocioId || !(MEDIOS_PAGO as readonly string[]).includes(medio)) return;
  if (!Number.isFinite(monto) || monto <= 0) return;

  const ventas = await prisma.venta.findMany({
    where: { negocioId },
    include: { pagos: { select: { monto: true } } },
    orderBy: { fecha: "asc" },
  });

  for (const v of ventas) {
    if (monto <= 0) break;
    const pagado = v.pagos.reduce((s, p) => s + Number(p.monto), 0);
    const saldo = Number(v.total) - pagado;
    if (saldo <= 0) continue;

    const aplicar = Math.min(saldo, monto);
    await prisma.pago.create({ data: { ventaId: v.id, medio, monto: aplicar } });
    await prisma.venta.update({
      where: { id: v.id },
      data: { estadoPago: estadoPagoDe(Number(v.total), pagado + aplicar) },
    });
    monto -= aplicar;
  }

  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/ventas");
}
