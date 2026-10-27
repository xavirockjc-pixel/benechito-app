"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { ubicacionBodegaId } from "@/lib/dominio/ubicaciones";

function revalidar() {
  revalidatePath("/admin/salidas-pendientes");
  revalidatePath("/admin/ventas");
  revalidatePath("/admin");
}

/** Busca un cliente por nombre; si no existe, lo crea con lo mínimo. */
async function clienteDe(nombre: string): Promise<string | null> {
  const n = nombre.trim();
  if (!n) return null;
  const low = n.toLowerCase();
  const negs = await prisma.negocio.findMany({ select: { id: true, nombreNegocio: true, nombreContacto: true }, take: 500 });
  const m = negs.find((x) => x.nombreNegocio?.toLowerCase() === low || x.nombreContacto?.toLowerCase() === low);
  if (m) return m.id;
  const creado = await prisma.negocio.create({
    data: { nombreNegocio: n, nombreContacto: n, whatsapp: "", comuna: "", tipoCliente: "ruta", origen: "manual", estado: "activo" },
  });
  return creado.id;
}

/**
 * Confirma que una salida de bodega SE VENDIÓ: crea la Venta (cliente + canal +
 * monto) y marca la salida como vendida. Así el cerebro analiza cuánto compra
 * ese cliente/canal.
 */
export async function confirmarSalidaVenta(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const sal = await prisma.salidaBodega.findUnique({ where: { id } });
  if (!sal || sal.estado !== "pendiente") return;

  const clienteTxt = String(formData.get("cliente") ?? "").trim() || sal.destinoTexto || "Cliente";
  // Venta originada por una salida de BODEGA: canal "bodega" por defecto, para que
  // no se mezcle con las ventas del local ni del vendedor en ruta.
  const canal = ["bodega", "local", "ruta", "distribuidor", "directa"].includes(String(formData.get("canal") ?? "")) ? String(formData.get("canal")) : "bodega";
  const total = Number(String(formData.get("total") ?? "").replace(/[^0-9]/g, "")) || 0;

  const negocioId = sal.negocioId ?? (await clienteDe(clienteTxt));
  const ubicacionId = await ubicacionBodegaId();
  if (!negocioId || !ubicacionId) return;

  const venta = await prisma.venta.create({
    data: { negocioId, ubicacionId, total, canal, estadoPago: "pendiente", etiqueta: `Salida bodega: ${sal.nombre}` },
  });
  await prisma.salidaBodega.update({
    where: { id },
    data: { estado: "vendida", ventaId: venta.id, total, negocioId, resueltaEn: new Date() },
  });
  revalidar();
}

/** Marca la salida como uso interno / merma (no es venta). */
export async function marcarSalidaInterna(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.salidaBodega.updateMany({ where: { id, estado: "pendiente" }, data: { estado: "interna", resueltaEn: new Date() } });
  revalidar();
}

/** Descarta la salida (no cuenta). */
export async function descartarSalida(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.salidaBodega.updateMany({ where: { id, estado: "pendiente" }, data: { estado: "descartada", resueltaEn: new Date() } });
  revalidar();
}
