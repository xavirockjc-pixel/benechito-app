"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { fechaDesde } from "@/lib/dominio/agenda";

// Rutas que muestran retiros: se revalidan todas para que central y departamentos
// queden siempre sincronizados.
const RUTAS = ["/admin/retiros", "/caja", "/bodega", "/vendedor/agenda"];
const revalidarTodo = () => RUTAS.forEach((r) => revalidatePath(r));

/**
 * Captura un pedido de retiro que entró por WhatsApp / Facebook / Instagram y cae
 * en la central. Queda destino="central" (sin despachar) hasta que se asigne a un depto.
 */
export async function crearRetiro(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim() || null;
  const contacto = String(formData.get("contacto") ?? "").trim() || null;
  const canal = String(formData.get("canal") ?? "manual").trim();
  const notas = String(formData.get("notas") ?? "").trim();
  const cuando = String(formData.get("cuando") ?? "hoy").trim();
  const destino = String(formData.get("destino") ?? "central").trim(); // puede despacharse al crear
  if (!notas && !negocioId && !contacto) return;

  let titulo = contacto ?? "Cliente";
  if (negocioId) {
    const n = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombreNegocio: true } });
    titulo = n?.nombreNegocio ?? titulo;
  }

  await prisma.agenda.create({
    data: {
      titulo: `🧾 Retiro · ${titulo}`,
      fecha: fechaDesde(cuando),
      tipo: "retiro",
      estado: "pendiente",
      negocioId,
      contacto,
      canal,
      destino: ["local", "bodega", "reparto"].includes(destino) ? destino : "central",
      notas: notas || null,
    },
  });

  revalidarTodo();
}

/** Despacha (o reasigna) un retiro a un departamento: local | bodega | reparto. */
export async function despacharRetiro(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const destino = String(formData.get("destino") ?? "").trim();
  if (!id || !["local", "bodega", "reparto", "central"].includes(destino)) return;
  await prisma.agenda.update({ where: { id }, data: { destino, estado: "pendiente" } });
  revalidarTodo();
}

/** Avanza el estado de un retiro: pendiente → en_proceso → hecho (o cancelar). */
export async function avanzarRetiro(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const a = String(formData.get("a") ?? "").trim();
  if (!id || !["pendiente", "en_proceso", "hecho", "cancelado"].includes(a)) return;
  await prisma.agenda.update({ where: { id }, data: { estado: a } });
  revalidarTodo();
}

/** Elimina un retiro. */
export async function eliminarRetiro(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.agenda.delete({ where: { id } });
  revalidarTodo();
}
