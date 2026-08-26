"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";

const num = (v: FormDataEntryValue | null) => Math.max(0, Number(String(v ?? "0").replace(",", ".")) || 0);

/** Registra el costo de un reparto: combustible + tiempo (+ km opcional). */
export async function registrarCostoReparto(formData: FormData) {
  const combustible = num(formData.get("combustible"));
  const horas = num(formData.get("horas"));
  const km = num(formData.get("km"));
  const canal = String(formData.get("canal") ?? "").trim() || null;
  const notas = String(formData.get("notas") ?? "").trim() || null;
  if (combustible <= 0 && horas <= 0 && km <= 0) return;
  const u = await usuarioActual();
  await prisma.costoReparto.create({
    data: { combustible, horas, km, canal, notas, usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null },
  });
  revalidatePath("/admin/repartos");
}

/** Elimina un registro de costo de reparto. */
export async function eliminarCostoReparto(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.costoReparto.delete({ where: { id } });
  revalidatePath("/admin/repartos");
}
