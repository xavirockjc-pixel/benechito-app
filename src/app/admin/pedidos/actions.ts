"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listaParaCliente, resolverPrecio } from "@/lib/dominio/precios";
import { esEstadoPedido } from "@/lib/dominio/pedidos";

/** Crea un pedido (cabecera) y redirige a su ficha para agregar las líneas. */
export async function crearPedido(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const canal = String(formData.get("canal") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim() || null;
  if (!negocioId || !canal) return;

  const pedido = await prisma.pedido.create({
    data: { negocioId, canal, notas, estado: "solicitud" },
  });

  revalidatePath("/admin/pedidos");
  redirect(`/admin/pedidos/${pedido.id}`);
}

/** Agrega (o suma) una línea al pedido, con el precio resuelto según el cliente. */
export async function agregarItem(formData: FormData) {
  const pedidoId = String(formData.get("pedidoId") ?? "").trim();
  const productoId = String(formData.get("productoId") ?? "").trim();
  const cantidad = Number(String(formData.get("cantidad") ?? "").trim());
  if (!pedidoId || !productoId || !Number.isFinite(cantidad) || cantidad <= 0) return;

  const pedido = await prisma.pedido.findUnique({ where: { id: pedidoId } });
  if (!pedido) return;

  // Precio según la lista del cliente (0 si el producto no tiene precio en su lista).
  const listaId = await listaParaCliente(pedido.negocioId);
  const precio = listaId ? await resolverPrecio(productoId, listaId, cantidad) : null;
  const precioUnit = precio ?? 0;

  const existente = await prisma.pedidoItem.findFirst({ where: { pedidoId, productoId } });
  if (existente) {
    await prisma.pedidoItem.update({
      where: { id: existente.id },
      data: { cantidad: existente.cantidad + cantidad, precioUnit },
    });
  } else {
    await prisma.pedidoItem.create({
      data: { pedidoId, productoId, cantidad, precioUnit },
    });
  }

  revalidatePath(`/admin/pedidos/${pedidoId}`);
}

/** Quita una línea del pedido. */
export async function quitarItem(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "").trim();
  const pedidoId = String(formData.get("pedidoId") ?? "").trim();
  if (!itemId) return;

  await prisma.pedidoItem.delete({ where: { id: itemId } });
  revalidatePath(`/admin/pedidos/${pedidoId}`);
}

/** Cambia el estado del pedido (independiente del pago). */
export async function cambiarEstadoPedido(formData: FormData) {
  const pedidoId = String(formData.get("pedidoId") ?? "").trim();
  const estado = String(formData.get("estado") ?? "").trim();
  if (!pedidoId || !esEstadoPedido(estado)) return;

  await prisma.pedido.update({ where: { id: pedidoId }, data: { estado } });
  revalidatePath(`/admin/pedidos/${pedidoId}`);
  revalidatePath("/admin/pedidos");
}
