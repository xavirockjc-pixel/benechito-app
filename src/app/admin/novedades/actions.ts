"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function revalidar() {
  revalidatePath("/admin/novedades");
  revalidatePath("/portal/cliente", "layout"); // todos los portales de cliente
}

/** Crea una novedad (promo / nuevo producto / nuevo sabor) para el portal del cliente. */
export async function crearNovedad(formData: FormData) {
  const titulo = String(formData.get("titulo") ?? "").trim();
  if (!titulo) return;
  const tipo = String(formData.get("tipo") ?? "promo").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim() || null;
  const cta = String(formData.get("cta") ?? "").trim() || null;
  const fotoRaw = String(formData.get("fotoUrl") ?? "");
  const fotoUrl = fotoRaw.startsWith("data:image/") || fotoRaw.startsWith("http") ? fotoRaw : null;

  await prisma.novedad.create({
    data: { tipo: ["promo", "nuevo", "sabor"].includes(tipo) ? tipo : "promo", titulo, descripcion, cta, fotoUrl },
  });
  revalidar();
}

/** Activa/desactiva una novedad (sin borrarla). */
export async function toggleNovedad(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const n = await prisma.novedad.findUnique({ where: { id }, select: { activo: true } });
  if (!n) return;
  await prisma.novedad.update({ where: { id }, data: { activo: !n.activo } });
  revalidar();
}

/** Elimina una novedad. */
export async function eliminarNovedad(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.novedad.delete({ where: { id } });
  revalidar();
}
