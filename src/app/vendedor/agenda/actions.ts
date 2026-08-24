"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/** Devuelve una fecha (Date) a las 12:00 para "hoy", "mañana" o un ISO yyyy-mm-dd. */
function fechaDesde(valor: string): Date {
  const hoy = new Date();
  hoy.setHours(12, 0, 0, 0);
  if (valor === "hoy" || !valor) return hoy;
  if (valor === "manana") {
    const m = new Date(hoy);
    m.setDate(m.getDate() + 1);
    return m;
  }
  const [y, mo, d] = valor.split("-").map(Number);
  if (y && mo && d) return new Date(y, mo - 1, d, 12, 0, 0, 0);
  return hoy;
}

/**
 * Agenda una entrega/pedido para un cliente (hoy o mañana). Queda registrada para
 * después cargar y llevar. tipo = "entrega" (normal) o "express" (delivery exprés).
 */
export async function agendarEntrega(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const cuando = String(formData.get("cuando") ?? "hoy").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  const cantidad = Number(String(formData.get("cantidad") ?? "").trim());
  const tipo = String(formData.get("tipo") ?? "entrega").trim() === "express" ? "express" : "entrega";
  if (!negocioId) return;

  const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombreNegocio: true } });
  const titulo = negocio?.nombreNegocio ?? "Entrega";

  await prisma.agenda.create({
    data: {
      titulo: tipo === "express" ? `🛵 Exprés · ${titulo}` : titulo,
      fecha: fechaDesde(cuando),
      tipo,
      estado: "pendiente",
      negocioId,
      cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : null,
      notas: notas || null,
    },
  });

  await prisma.actividad.create({
    data: {
      negocioId,
      tipo: "contacto",
      descripcion: tipo === "express" ? `Pedido exprés agendado${notas ? ": " + notas : ""}` : `Entrega agendada${notas ? ": " + notas : ""}`,
    },
  });

  revalidatePath("/vendedor/agenda");
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
  const a = String(formData.get("a") ?? "").trim(); // en_proceso | hecho | cancelado
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
