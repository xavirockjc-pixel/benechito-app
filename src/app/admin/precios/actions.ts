"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/** Crea una nueva lista de precios. */
export async function crearLista(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const canal = String(formData.get("canal") ?? "").trim();
  if (!nombre || !canal) return;

  const lista = await prisma.listaPrecio.create({ data: { nombre, canal } });
  revalidatePath("/admin/precios");
  redirect(`/admin/precios/${lista.id}`);
}

/** Edita nombre / canal / estado de una lista. */
export async function actualizarLista(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const canal = String(formData.get("canal") ?? "").trim();
  if (!id || !nombre || !canal) return;

  await prisma.listaPrecio.update({
    where: { id },
    data: { nombre, canal, activo: formData.get("activo") === "si" },
  });
  revalidatePath("/admin/precios");
  revalidatePath(`/admin/precios/${id}`);
}

/** Elimina una lista (desasigna antes a los clientes que la usaban). */
export async function eliminarLista(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  await prisma.negocio.updateMany({ where: { listaPrecioId: id }, data: { listaPrecioId: null } });
  await prisma.listaPrecio.delete({ where: { id } }); // precios en cascada
  revalidatePath("/admin/precios");
  redirect("/admin/precios");
}

/**
 * Guarda los precios (tramo base, cantidadMinima = 1) de todos los productos para UNA lista.
 * Los inputs vienen como `precio_<productoId>`. Un valor vacío o 0 borra el precio de ese
 * producto en la lista (así el producto puede "no estar disponible" en ese canal).
 */
export async function guardarPrecios(formData: FormData) {
  const listaId = String(formData.get("listaId") ?? "");
  if (!listaId) return;

  const productos = await prisma.producto.findMany({ select: { id: true } });

  for (const { id: productoId } of productos) {
    const raw = String(formData.get(`precio_${productoId}`) ?? "").trim().replace(",", ".");
    const valor = raw === "" ? NaN : Number(raw);

    if (!Number.isFinite(valor) || valor <= 0) {
      // sin precio en esta lista → eliminar el tramo base si existía
      await prisma.precioProducto.deleteMany({
        where: { productoId, listaId, cantidadMinima: 1 },
      });
      continue;
    }

    await prisma.precioProducto.upsert({
      where: { productoId_listaId_cantidadMinima: { productoId, listaId, cantidadMinima: 1 } },
      update: { precio: valor },
      create: { productoId, listaId, cantidadMinima: 1, precio: valor },
    });
  }

  revalidatePath(`/admin/precios/${listaId}`);
  revalidatePath("/admin/precios");
}

/**
 * Agrega/actualiza un TRAMO por cantidad (mayoreo): desde `cantidadMinima` unidades,
 * el producto tiene otro `precio` en esta lista. cantidadMinima debe ser >= 2.
 */
export async function agregarTramoPrecio(formData: FormData) {
  const listaId = String(formData.get("listaId") ?? "").trim();
  const productoId = String(formData.get("productoId") ?? "").trim();
  const cantidadMinima = Math.floor(Number(formData.get("cantidadMinima") ?? 0));
  const precio = Math.max(0, Math.floor(Number(formData.get("precio") ?? 0)));
  if (!listaId || !productoId || cantidadMinima < 2 || precio <= 0) return;
  await prisma.precioProducto.upsert({
    where: { productoId_listaId_cantidadMinima: { productoId, listaId, cantidadMinima } },
    update: { precio },
    create: { productoId, listaId, cantidadMinima, precio },
  });
  revalidatePath(`/admin/precios/${listaId}`);
}

/** Borra un tramo por cantidad (no toca el precio base, cantidadMinima = 1). */
export async function eliminarTramoPrecio(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const listaId = String(formData.get("listaId") ?? "").trim();
  if (!id) return;
  const t = await prisma.precioProducto.findUnique({ where: { id } });
  if (!t || t.cantidadMinima <= 1) return;
  await prisma.precioProducto.delete({ where: { id } });
  if (listaId) revalidatePath(`/admin/precios/${listaId}`);
}
