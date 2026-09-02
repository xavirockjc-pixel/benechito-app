"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const val = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return v ? String(v).trim() : "";
};

/** Guarda la foto de un producto (imagen subida y comprimida a data URL). */
export async function guardarFotoProducto(formData: FormData) {
  const id = val(formData, "id");
  const fotoUrl = String(formData.get("fotoUrl") ?? "");
  if (!id) return;
  // Solo acepta data URL de imagen (subida) o una URL http; evita basura.
  const ok = fotoUrl.startsWith("data:image/") || fotoUrl.startsWith("http");
  await prisma.producto.update({ where: { id }, data: { fotoUrl: ok ? fotoUrl : null } });
  revalidatePath("/admin/productos/imagenes");
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
}

/** Guarda las reglas de cantidad de la tienda (mínimo/máximo) de un producto. */
export async function guardarReglasTienda(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  const min = Math.max(1, Math.floor(Number(val(formData, "minTienda")) || 1));
  const maxRaw = Math.floor(Number(val(formData, "maxTienda")) || 0);
  const max = maxRaw > 0 && maxRaw >= min ? maxRaw : 0;
  await prisma.producto.update({ where: { id }, data: { minTienda: min, maxTienda: max } });
  revalidatePath("/admin/productos/imagenes");
  revalidatePath("/tienda");
}

/** Guarda los sabores del producto para la tienda (separados por coma). */
export async function guardarSaboresTienda(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  const raw = String(formData.get("saboresTienda") ?? "");
  const limpio = raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).join(", ");
  await prisma.producto.update({ where: { id }, data: { saboresTienda: limpio || null } });
  revalidatePath("/admin/productos/imagenes");
  revalidatePath("/tienda");
}

const listaSabores = (s: string | null) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

/** Marca/desmarca un sabor como disponible hoy (para que el cliente vea solo los que hay). */
export async function toggleSaborDisponible(formData: FormData) {
  const id = val(formData, "id");
  const sabor = val(formData, "sabor");
  if (!id || !sabor) return;
  const prod = await prisma.producto.findUnique({ where: { id }, select: { saboresNoDisp: true } });
  if (!prod) return;
  const noDisp = new Set(listaSabores(prod.saboresNoDisp));
  if (noDisp.has(sabor)) noDisp.delete(sabor); // estaba no disponible → ahora disponible
  else noDisp.add(sabor); // estaba disponible → ahora no
  await prisma.producto.update({ where: { id }, data: { saboresNoDisp: [...noDisp].join(", ") || null } });
  revalidatePath("/admin/productos/disponibilidad");
  revalidatePath("/tienda");
}

/** Marca TODOS los sabores de un producto como disponibles (limpia el "no disponible"). */
export async function marcarTodosDisponibles(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.producto.update({ where: { id }, data: { saboresNoDisp: null } });
  revalidatePath("/admin/productos/disponibilidad");
  revalidatePath("/tienda");
}

/** Activa/desactiva la opción "Mixto al azar" de un producto. */
export async function togglePermiteMixto(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  const prod = await prisma.producto.findUnique({ where: { id }, select: { permiteMixto: true } });
  if (!prod) return;
  await prisma.producto.update({ where: { id }, data: { permiteMixto: !prod.permiteMixto } });
  revalidatePath("/admin/productos/disponibilidad");
  revalidatePath("/tienda");
}

/** Marca/desmarca un producto para la tienda (toggle rápido desde la galería). */
export async function togglePublicarTienda(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  const p = await prisma.producto.findUnique({ where: { id }, select: { publicarTienda: true } });
  if (!p) return;
  await prisma.producto.update({ where: { id }, data: { publicarTienda: !p.publicarTienda } });
  revalidatePath("/admin/productos/imagenes");
  revalidatePath("/tienda");
}

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
      publicarTienda: formData.get("publicarTienda") === "si",
      stockMinimo: Math.max(0, Math.floor(Number(val(formData, "stockMinimo")) || 0)),
      descripcion: val(formData, "descripcion") || null,
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
      publicarTienda: formData.get("publicarTienda") === "si",
      stockMinimo: Math.max(0, Math.floor(Number(val(formData, "stockMinimo")) || 0)),
      descripcion: val(formData, "descripcion") || null,
      fotoUrl: String(formData.get("fotoUrl") ?? "").trim() || null,
      costo: val(formData, "costo") ? Number(val(formData, "costo")) : null,
      activo: formData.get("activo") === "si",
    },
  });

  revalidatePath("/admin/productos");
  revalidatePath("/admin/precios");
  redirect("/admin/productos");
}
