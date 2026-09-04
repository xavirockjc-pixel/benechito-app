"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Fija (o limpia) el sueldo base mensual de un trabajador. */
export async function setSueldoBase(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const raw = String(formData.get("sueldoBase") ?? "").replace(/[^\d]/g, "");
  const sueldoBase = raw ? Number(raw) : null;
  await prisma.trabajador.update({ where: { id }, data: { sueldoBase } });
  revalidatePath("/admin/sueldos");
}

/** Registra el pago del líquido del mes como movimiento de la cuenta del trabajador. */
export async function registrarPagoLiquido(formData: FormData) {
  const trabajadorId = String(formData.get("trabajadorId") ?? "").trim();
  const monto = Number(String(formData.get("monto") ?? "").replace(/[^\d]/g, ""));
  const mes = String(formData.get("mes") ?? "").trim();
  if (!trabajadorId || !Number.isFinite(monto) || monto <= 0) return;
  await prisma.movimientoTrabajador.create({
    data: { trabajadorId, tipo: "pago", monto, notas: `Pago liquidación ${mes}` },
  });
  revalidatePath("/admin/sueldos");
  revalidatePath(`/admin/equipo/${trabajadorId}`);
}
