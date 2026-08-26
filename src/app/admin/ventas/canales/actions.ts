"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const slug = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

/** Agrega un canal de venta nuevo. */
export async function crearCanal(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || "#334155";
  if (!nombre) return;
  let codigo = slug(nombre) || `canal_${Date.now()}`;
  // Evita choque de código.
  const existe = await prisma.canalVenta.findUnique({ where: { codigo } });
  if (existe) codigo = `${codigo}_${Date.now().toString().slice(-4)}`;
  const max = await prisma.canalVenta.aggregate({ _max: { orden: true } });
  await prisma.canalVenta.create({
    data: { codigo, nombre, color, orden: (max._max.orden ?? 0) + 1 },
  });
  revalidatePath("/admin/ventas/canales");
  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
}

/** Edita nombre/color de un canal. */
export async function editarCanal(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const color = String(formData.get("color") ?? "").trim() || "#334155";
  if (!id || !nombre) return;
  await prisma.canalVenta.update({ where: { id }, data: { nombre, color } });
  revalidatePath("/admin/ventas/canales");
  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
}

/** Activa/desactiva un canal (no se borra para conservar historial). */
export async function toggleCanal(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const c = await prisma.canalVenta.findUnique({ where: { id } });
  if (!c) return;
  await prisma.canalVenta.update({ where: { id }, data: { activo: !c.activo } });
  revalidatePath("/admin/ventas/canales");
  revalidatePath("/admin/ventas");
}
