"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
      activo: formData.get("activo") === "si",
    },
  });

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
      activo: formData.get("activo") === "si",
    },
  });

  revalidatePath("/admin/productos");
  revalidatePath("/admin/precios");
  redirect("/admin/productos");
}
