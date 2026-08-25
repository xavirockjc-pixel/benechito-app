"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listaParaCliente, resolverPrecio, listaIdPorTipo } from "@/lib/dominio/precios";
import { esEstadoPedido } from "@/lib/dominio/pedidos";

/** Cliente genérico de mostrador (walk-in), para pedidos sin cliente. */
async function clienteMostrador() {
  let c = await prisma.negocio.findFirst({ where: { nombreNegocio: "Consumidor Final" } });
  if (!c) {
    c = await prisma.negocio.create({
      data: { nombreContacto: "Consumidor Final", nombreNegocio: "Consumidor Final", whatsapp: "", comuna: "", tipoCliente: "consumidor", estado: "punto_activo", origen: "pos" },
    });
  }
  return c;
}

/**
 * Crea un pedido (cabecera). El cliente es OPCIONAL (si no se elige, va a mostrador).
 * Según cómo se entregue (retiro/delivery) se despacha al área (bodega/local/reparto)
 * creando el despacho centralizado, y luego redirige a la ficha para agregar líneas.
 */
export async function crearPedido(formData: FormData) {
  const negocioIdSel = String(formData.get("negocioId") ?? "").trim();
  const canal = String(formData.get("canal") ?? "").trim();
  const tipoCliente = String(formData.get("tipoCliente") ?? "").trim();
  const tipoEntrega = String(formData.get("tipoEntrega") ?? "").trim() || null; // local|retiro|delivery
  const destinoRaw = String(formData.get("destino") ?? "").trim();
  const destino = ["bodega", "local", "reparto"].includes(destinoRaw) ? destinoRaw : null;
  const notas = String(formData.get("notas") ?? "").trim() || null;
  if (!canal) return;

  const cliente = negocioIdSel
    ? (await prisma.negocio.findUnique({ where: { id: negocioIdSel } })) ?? (await clienteMostrador())
    : await clienteMostrador();

  // Lista de precios: la del cliente si existe; si no, la del tipo de cliente elegido.
  const listaPrecioId = negocioIdSel
    ? await listaParaCliente(cliente.id)
    : (tipoCliente ? await listaIdPorTipo(tipoCliente) : null);

  const pedido = await prisma.pedido.create({
    data: { negocioId: cliente.id, canal, tipoEntrega, destino, notas, listaPrecioId, estado: "solicitud" },
  });

  // Si es retiro o delivery y hay destino, lo despacha al área (aparece en su app).
  if ((tipoEntrega === "retiro" || tipoEntrega === "delivery") && destino) {
    await prisma.agenda.create({
      data: {
        titulo: `🧾 Pedido · ${cliente.nombreNegocio}`,
        fecha: new Date(),
        tipo: "retiro",
        estado: "pendiente",
        negocioId: cliente.id,
        canal,
        destino,
        notas: notas ?? `Pedido ${tipoEntrega}`,
      },
    });
  }

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/retiros");
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

  // Precio manual si se indicó; si no, según la lista del pedido (por tipo) o del cliente.
  const manual = Number(String(formData.get("precioUnit") ?? "").trim().replace(/[^0-9.]/g, ""));
  let precioUnit: number;
  if (Number.isFinite(manual) && manual > 0) {
    precioUnit = manual;
  } else {
    const listaId = pedido.listaPrecioId ?? (await listaParaCliente(pedido.negocioId));
    const precio = listaId ? await resolverPrecio(productoId, listaId, cantidad) : null;
    precioUnit = precio != null ? Number(precio) : 0;
  }

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

/** Elimina un pedido completo (sus líneas se borran en cascada). */
export async function eliminarPedido(formData: FormData) {
  const pedidoId = String(formData.get("pedidoId") ?? "").trim();
  if (!pedidoId) return;
  await prisma.pedido.delete({ where: { id: pedidoId } });
  revalidatePath("/admin/pedidos");
  redirect("/admin/pedidos");
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
