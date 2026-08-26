"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { TIPOS_GASTO } from "@/lib/dominio/vehiculo";

const num = (v: FormDataEntryValue | null) => Math.max(0, Number(String(v ?? "0").replace(",", ".")) || 0);

/** Registra un gasto del vehículo desde la central. */
export async function registrarGastoVehiculo(formData: FormData) {
  const tipoRaw = String(formData.get("tipo") ?? "combustible").trim();
  const tipo = (TIPOS_GASTO as readonly string[]).includes(tipoRaw) ? tipoRaw : "otro";
  const monto = num(formData.get("monto"));
  const litros = num(formData.get("litros"));
  const canal = String(formData.get("canal") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;
  if (monto <= 0 && litros <= 0) return;
  const u = await usuarioActual();
  await prisma.gastoVehiculo.create({
    data: { tipo, monto, litros, canal, notas, usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null },
  });
  revalidatePath("/admin/repartos");
}

/** Elimina un gasto del vehículo. */
export async function eliminarGastoVehiculo(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.gastoVehiculo.delete({ where: { id } });
  revalidatePath("/admin/repartos");
}
