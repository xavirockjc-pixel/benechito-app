"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";

const AREAS = new Set(["bodega", "caja", "vendedor", "produccion", "jefatura"]);

/** Crea una nota personal (privada) del trabajador que la escribe, en un área. */
export async function crearNotaPersonal(formData: FormData) {
  const u = await usuarioActual();
  if (!u?.sub) return;
  const texto = String(formData.get("texto") ?? "").trim();
  if (!texto) return;
  const areaRaw = String(formData.get("area") ?? "").trim();
  const area = AREAS.has(areaRaw) ? areaRaw : "bodega";
  const asunto = String(formData.get("asunto") ?? "").trim() || null;
  const color = String(formData.get("color") ?? "").trim() || null;
  const fechaStr = String(formData.get("fecha") ?? "").trim();
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaStr) ? new Date(fechaStr + "T12:00:00") : new Date();
  await prisma.notaPersonal.create({ data: { usuarioId: u.sub, area, asunto, texto, color, fecha } });
  const volver = String(formData.get("volver") ?? `/${area}/notas`);
  revalidatePath(volver);
  redirect(volver);
}

/** Borra una nota personal (solo si es del propio trabajador). */
export async function eliminarNotaPersonal(formData: FormData) {
  const u = await usuarioActual();
  if (!u?.sub) return;
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.notaPersonal.deleteMany({ where: { id, usuarioId: u.sub } });
  revalidatePath(String(formData.get("volver") ?? "/bodega/notas"));
}
