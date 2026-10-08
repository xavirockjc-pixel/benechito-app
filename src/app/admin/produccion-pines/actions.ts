"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { empresaActual } from "@/lib/dominio/empresa";
import { LINEAS_PRODUCCION } from "@/lib/dominio/produccion";

/** Guarda los PIN/códigos por producto (solo dígitos; vacío = sin bloqueo). */
export async function guardarPinesProduccion(formData: FormData) {
  const pines: Record<string, string> = {};
  for (const l of LINEAS_PRODUCCION) {
    const v = String(formData.get(`pin_${l}`) ?? "").replace(/[^0-9]/g, "").trim();
    if (v) pines[l] = v;
  }
  const e = await empresaActual();
  await prisma.empresa.update({ where: { id: e.id }, data: { pinesProduccion: JSON.stringify(pines) } });
  revalidatePath("/admin/produccion-pines");
  revalidatePath("/produccion");
}
