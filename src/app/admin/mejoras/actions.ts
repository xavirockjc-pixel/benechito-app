"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AREAS_MEJORA, PRIORIDADES, ESTADOS_MEJORA } from "@/lib/dominio/mejoras";

const pick = <T extends readonly string[]>(v: FormDataEntryValue | null, opts: T, def: T[number]): T[number] => {
  const s = String(v ?? "").trim();
  return (opts as readonly string[]).includes(s) ? (s as T[number]) : def;
};

/** Crea una mejora / proyección. */
export async function crearMejora(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;
  const detalle = String(formData.get("detalle") ?? "").trim() || null;
  const area = pick(formData.get("area"), AREAS_MEJORA, "general");
  const prioridad = pick(formData.get("prioridad"), PRIORIDADES, "media");
  const fechaStr = String(formData.get("fechaObjetivo") ?? "").trim();
  const fechaObjetivo = fechaStr ? new Date(fechaStr) : null;
  const recordar = String(formData.get("recordar") ?? "") === "on" || String(formData.get("recordar") ?? "") === "true";

  await prisma.mejora.create({
    data: { titulo, detalle, area, prioridad, fechaObjetivo: fechaObjetivo && !isNaN(fechaObjetivo.getTime()) ? fechaObjetivo : null, recordar },
  });
  revalidatePath("/admin/mejoras");
}

/** Cambia el estado (avanzar o marcar). Al pasar a "hecha" guarda la fecha de cumplimiento. */
export async function setEstadoMejora(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const estado = pick(formData.get("estado"), ESTADOS_MEJORA, "pendiente");
  if (!id) return;
  await prisma.mejora.update({
    where: { id },
    data: { estado, completadaEn: estado === "hecha" ? new Date() : null },
  });
  revalidatePath("/admin/mejoras");
}

/** Borra una mejora. */
export async function eliminarMejora(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.mejora.delete({ where: { id } });
  revalidatePath("/admin/mejoras");
}
