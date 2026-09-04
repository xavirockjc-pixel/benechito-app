"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { AREAS_NOTA, TIPOS_NOTA } from "@/lib/dominio/notas";
import { PRIORIDADES } from "@/lib/dominio/mejoras";

const pick = <T extends readonly string[]>(v: FormDataEntryValue | null, opts: T, def: T[number]): T[number] => {
  const s = String(v ?? "").trim();
  return (opts as readonly string[]).includes(s) ? (s as T[number]) : def;
};

/** Crea una nota rápida (desde cualquier app). */
export async function crearNota(formData: FormData) {
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;
  const tipo = pick(formData.get("tipo"), TIPOS_NOTA, "observacion");
  const area = pick(formData.get("area"), AREAS_NOTA, "general");
  const prioridad = pick(formData.get("prioridad"), PRIORIDADES, "media");
  const autor = String(formData.get("autor") ?? "").trim() || null;

  await prisma.nota.create({ data: { texto, tipo, area, prioridad, autor } });
  revalidatePath("/admin/notas");
  revalidatePath("/admin/supercerebro");
}

/** Marca una nota como hecha / la reabre. */
export async function toggleNota(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const actual = await prisma.nota.findUnique({ where: { id }, select: { estado: true } });
  if (!actual) return;
  const hecha = actual.estado !== "hecha";
  await prisma.nota.update({
    where: { id },
    data: { estado: hecha ? "hecha" : "abierta", hechaEn: hecha ? new Date() : null },
  });
  revalidatePath("/admin/notas");
  revalidatePath("/admin/supercerebro");
}

/** Borra una nota. */
export async function eliminarNota(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.nota.delete({ where: { id } });
  revalidatePath("/admin/notas");
  revalidatePath("/admin/supercerebro");
}
