"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

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
