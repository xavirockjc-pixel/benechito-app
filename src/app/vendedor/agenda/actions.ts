"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fechaDesde } from "@/lib/dominio/agenda";

/**
 * Agenda una entrega / próxima visita / pedido exprés para un cliente.
 * tipo = "entrega" (hoy o mañana), "visita" (próxima visita con fecha + pedido que
 * reservan) o "express" (delivery exprés de hoy). Queda registrada para después
 * cargar y llevar, y alimenta la preventa/planificación de la central.
 */
export async function agendarEntrega(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const cuando = String(formData.get("cuando") ?? "hoy").trim(); // hoy | manana | otra
  const fechaOtra = String(formData.get("fechaOtra") ?? "").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  const cantidad = Number(String(formData.get("cantidad") ?? "").trim());
  const tipoRaw = String(formData.get("tipo") ?? "entrega").trim();
  const tipo = ["entrega", "visita", "express"].includes(tipoRaw) ? tipoRaw : "entrega";
  if (!negocioId) return;

  const fecha = cuando === "otra" && fechaOtra ? fechaDesde(fechaOtra) : fechaDesde(cuando);

  const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombreNegocio: true } });
  const nombre = negocio?.nombreNegocio ?? "Cliente";
  const prefijo = tipo === "express" ? "🛵 Exprés · " : tipo === "visita" ? "🗓️ Visita · " : "";

  await prisma.agenda.create({
    data: {
      titulo: `${prefijo}${nombre}`,
      fecha,
      tipo,
      estado: "pendiente",
      negocioId,
      cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : null,
      notas: notas || null,
    },
  });

  const que =
    tipo === "express" ? "Pedido exprés agendado" : tipo === "visita" ? "Próxima visita con reserva" : "Entrega agendada";
  await prisma.actividad.create({
    data: { negocioId, tipo: "contacto", descripcion: `${que}${notas ? ": " + notas : ""}` },
  });

  revalidatePath("/vendedor/agenda");
  revalidatePath("/admin/preventa");
  redirect("/vendedor/agenda?ok=1");
}

/** Deja registrado que se contactó al cliente (WhatsApp / llamada) para confirmar. */
export async function marcarContactado(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  if (!negocioId) return;
  await prisma.actividad.create({
    data: { negocioId, tipo: "contacto", descripcion: "Cliente contactado para confirmar entrega" },
  });
  revalidatePath("/vendedor/agenda");
}

/**
 * Avanza el estado de un agendado en el flujo de trabajo:
 * pendiente → en_proceso (cargado, listo para llevar) → hecho (entregado).
 */
export async function avanzarAgendado(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const a = String(formData.get("a") ?? "").trim();
  if (!id || !["en_proceso", "hecho", "cancelado", "pendiente"].includes(a)) return;
  await prisma.agenda.update({ where: { id }, data: { estado: a } });
  revalidatePath("/vendedor/agenda");
}

/** Elimina un agendado (cancelación/errores). */
export async function eliminarAgendado(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.agenda.delete({ where: { id } });
  revalidatePath("/vendedor/agenda");
}
