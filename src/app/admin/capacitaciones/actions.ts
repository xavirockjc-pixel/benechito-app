"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";

function datos(formData: FormData) {
  return {
    titulo: String(formData.get("titulo") ?? "").trim(),
    descripcion: String(formData.get("descripcion") ?? "").trim() || null,
    categoria: String(formData.get("categoria") ?? "fabricacion"),
    urlVideo: String(formData.get("urlVideo") ?? "").trim() || null,
    pasos: String(formData.get("pasos") ?? "").trim() || null,
    productoId: String(formData.get("productoId") ?? "").trim() || null,
    rol: String(formData.get("rol") ?? "todos"),
  };
}

export async function crearCapacitacion(formData: FormData) {
  const d = datos(formData);
  if (!d.titulo) return;
  await prisma.capacitacion.create({ data: d });
  revalidatePath("/admin/capacitaciones");
  redirect("/admin/capacitaciones");
}

export async function actualizarCapacitacion(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.capacitacion.update({ where: { id }, data: datos(formData) });
  revalidatePath("/admin/capacitaciones");
  redirect("/admin/capacitaciones");
}

export async function toggleCapacitacion(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const c = await prisma.capacitacion.findUnique({ where: { id }, select: { activo: true } });
  if (!c) return;
  await prisma.capacitacion.update({ where: { id }, data: { activo: !c.activo } });
  revalidatePath("/admin/capacitaciones");
}

export async function borrarCapacitacion(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.capacitacion.delete({ where: { id } });
  revalidatePath("/admin/capacitaciones");
}

/** Registra que un trabajador vio/entendió la capacitación. */
export async function marcarVista(formData: FormData) {
  const capacitacionId = String(formData.get("capacitacionId") ?? "").trim();
  const volver = String(formData.get("volver") ?? "/produccion/capacitaciones").trim();
  if (!capacitacionId) return;
  const u = await usuarioActual();
  await prisma.capacitacionVista.create({
    data: { capacitacionId, usuarioId: u?.sub ?? null, usuarioNombre: u?.nombre ?? null },
  });
  revalidatePath(volver);
  redirect(`${volver}?visto=1`);
}
