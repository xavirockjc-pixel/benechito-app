"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PRIORIDADES, ESTADOS_MEJORA, siguienteEstado } from "@/lib/dominio/mejoras";

const pick = <T extends readonly string[]>(v: FormDataEntryValue | null, opts: T, def: T[number]): T[number] => {
  const s = String(v ?? "").trim();
  return (opts as readonly string[]).includes(s) ? (s as T[number]) : def;
};

/**
 * Pendiente/mejora anotado desde el tablet de producción. Cae en Mejora (área
 * producción) para que el socio/admin lo vea en el panel y en el reporte diario.
 */
export async function crearPendienteProd(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;
  const detalle = String(formData.get("detalle") ?? "").trim() || null;
  const prioridad = pick(formData.get("prioridad"), PRIORIDADES, "media");
  await prisma.mejora.create({
    data: { titulo, detalle, area: "produccion", prioridad, estado: "pendiente", recordar: true },
  });
  revalidatePath("/produccion/mantenimiento");
  revalidatePath("/admin/mejoras");
}

/** Avanza el estado de una mejora (por hacer → en proceso → hecha). */
export async function avanzarMejoraProd(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const actual = pick(formData.get("estado"), ESTADOS_MEJORA, "pendiente");
  const estado = siguienteEstado(actual);
  await prisma.mejora.update({
    where: { id },
    data: { estado, completadaEn: estado === "hecha" ? new Date() : null },
  });
  revalidatePath("/produccion/mantenimiento");
  revalidatePath("/admin/mejoras");
}
