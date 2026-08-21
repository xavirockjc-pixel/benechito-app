"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Crea un sabor en una línea (trufa, cuchuflí, helado…). */
export async function crearSabor(formData: FormData) {
  const nombre = val(formData, "nombre");
  const linea = val(formData, "linea");
  if (!nombre || !linea) return;

  const existe = await prisma.sabor.findFirst({ where: { nombre, linea } });
  if (!existe) await prisma.sabor.create({ data: { nombre, linea } });
  revalidatePath("/admin/sabores");
}

/** Edita nombre / estado de un sabor. */
export async function actualizarSabor(formData: FormData) {
  const id = val(formData, "id");
  const nombre = val(formData, "nombre");
  if (!id || !nombre) return;
  await prisma.sabor.update({ where: { id }, data: { nombre, activo: formData.get("activo") === "si" } });
  revalidatePath("/admin/sabores");
}

/** Elimina un sabor (si tiene stock, se desactiva en vez de borrar). */
export async function eliminarSabor(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  try {
    await prisma.sabor.delete({ where: { id } });
  } catch {
    await prisma.sabor.update({ where: { id }, data: { activo: false } });
  }
  revalidatePath("/admin/sabores");
}
