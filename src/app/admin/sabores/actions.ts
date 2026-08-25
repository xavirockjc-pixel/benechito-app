"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Normaliza un tipo a un código simple (para `linea`). */
function codigoTipo(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "otro";
}

/**
 * Crea un sabor dentro de una Sección (dulce/helado) y un Tipo. El tipo puede ser
 * uno existente o uno nuevo escrito (se crea al vuelo).
 */
export async function crearSabor(formData: FormData) {
  const nombre = val(formData, "nombre");
  const seccion = val(formData, "seccion") || null;
  const tipoExistente = val(formData, "linea");
  const tipoNuevo = val(formData, "tipoNuevo");
  const linea = tipoNuevo ? codigoTipo(tipoNuevo) : tipoExistente;
  if (!nombre || !linea) return;

  const existe = await prisma.sabor.findFirst({ where: { nombre, linea } });
  if (!existe) await prisma.sabor.create({ data: { nombre, linea, seccion } });
  revalidatePath("/admin/sabores");
}

/** Renombra un tipo (línea) — cambia la etiqueta guardada como sabor "cabecera". No usada aún. */
export async function actualizarSabor(formData: FormData) {
  const id = val(formData, "id");
  const nombre = val(formData, "nombre");
  if (!id || !nombre) return;
  await prisma.sabor.update({ where: { id }, data: { nombre, activo: formData.get("activo") === "si" } });
  revalidatePath("/admin/sabores");
}

/** Elimina un sabor (si tiene stock/uso, se desactiva en vez de borrar). */
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

/** Cambia la sección de todos los sabores de un tipo (para clasificarlo). */
export async function moverTipoSeccion(formData: FormData) {
  const linea = val(formData, "linea");
  const seccion = val(formData, "seccion") || null;
  if (!linea) return;
  await prisma.sabor.updateMany({ where: { linea }, data: { seccion } });
  revalidatePath("/admin/sabores");
}
