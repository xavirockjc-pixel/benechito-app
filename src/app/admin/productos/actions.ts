"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const val = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return v ? String(v).trim() : "";
};

/** Alta de un producto del catálogo. */
export async function crearProducto(formData: FormData) {
  const nombre = val(formData, "nombre");
  const linea = val(formData, "linea");
  if (!nombre || !linea) return;

  await prisma.producto.create({
    data: {
      nombre,
      linea,
      base: val(formData, "base") || null,
      formato: val(formData, "formato") || null,
      sku: val(formData, "sku") || null,
      codigoBarras: val(formData, "codigoBarras") || null,
      categoria: val(formData, "categoria") || null,
      tipo: val(formData, "tipo") === "reventa" ? "reventa" : "propio",
      seccion: ["propio", "distribucion", "ruta", "promo"].includes(val(formData, "seccion")) ? val(formData, "seccion") : "propio",
      soloLocal: formData.get("soloLocal") === "si",
      fotoUrl: String(formData.get("fotoUrl") ?? "").trim() || null,
      costo: val(formData, "costo") ? Number(val(formData, "costo")) : null,
      activo: formData.get("activo") === "si",
    },
  });

  revalidatePath("/admin/productos");
  revalidatePath("/admin/precios");
  redirect("/admin/productos");
}

/**
 * Elimina un producto. Si está referenciado en pedidos/reposiciones/góndolas
 * (no se puede borrar sin perder historial), lo DESACTIVA en vez de romper.
 */
export async function eliminarProducto(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;

  try {
    await prisma.producto.delete({ where: { id } });
  } catch (e) {
    // FK constraint → el producto tiene historial; se desactiva.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
      await prisma.producto.update({ where: { id }, data: { activo: false } });
    } else {
      throw e;
    }
  }

  revalidatePath("/admin/productos");
  revalidatePath("/admin/precios");
  redirect("/admin/productos");
}

/** Edición de un producto existente. */
export async function actualizarProducto(formData: FormData) {
  const id = val(formData, "id");
  const nombre = val(formData, "nombre");
  const linea = val(formData, "linea");
  if (!id || !nombre || !linea) return;

  await prisma.producto.update({
    where: { id },
    data: {
      nombre,
      linea,
      base: val(formData, "base") || null,
      formato: val(formData, "formato") || null,
      sku: val(formData, "sku") || null,
      codigoBarras: val(formData, "codigoBarras") || null,
      categoria: val(formData, "categoria") || null,
      tipo: val(formData, "tipo") === "reventa" ? "reventa" : "propio",
      seccion: ["propio", "distribucion", "ruta", "promo"].includes(val(formData, "seccion")) ? val(formData, "seccion") : "propio",
      soloLocal: formData.get("soloLocal") === "si",
      fotoUrl: String(formData.get("fotoUrl") ?? "").trim() || null,
      costo: val(formData, "costo") ? Number(val(formData, "costo")) : null,
      activo: formData.get("activo") === "si",
    },
  });

  revalidatePath("/admin/productos");
  revalidatePath("/admin/precios");
  redirect("/admin/productos");
}
