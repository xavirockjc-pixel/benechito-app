"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { esEstadoPreventa } from "@/lib/dominio/preventa";

/** Envía el mensaje al webhook de n8n (que dispara Evolution → WhatsApp). No bloquea si falla. */
async function enviarAn8n(payload: { telefono: string; nombre: string; mensaje: string }) {
  const url = process.env.N8N_PREVENTA_WEBHOOK_URL;
  if (!url) return { ok: false, motivo: "sin_webhook" };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    return { ok: res.ok, motivo: res.ok ? "ok" : `http_${res.status}` };
  } catch {
    return { ok: false, motivo: "error_red" };
  }
}

/**
 * Envía preventa a los clientes seleccionados: personaliza el mensaje, registra la
 * preventa y dispara el envío por WhatsApp vía n8n. `{nombre}` se reemplaza por cliente.
 */
export async function enviarPreventa(formData: FormData) {
  const ids = formData.getAll("negocioIds").map((x) => String(x)).filter(Boolean);
  const plantilla = String(formData.get("mensaje") ?? "").trim();
  if (ids.length === 0 || !plantilla) return;

  const clientes = await prisma.negocio.findMany({ where: { id: { in: ids } } });

  for (const c of clientes) {
    const nombre = c.nombreContacto || c.nombreNegocio;
    const mensaje = plantilla.replaceAll("{nombre}", nombre);
    const telefono = c.whatsapp.replace(/[^0-9]/g, "");

    await prisma.preventa.create({ data: { negocioId: c.id, mensaje, estado: "enviada" } });
    await prisma.actividad.create({
      data: { negocioId: c.id, tipo: "contacto", descripcion: "Preventa enviada por WhatsApp" },
    });
    if (telefono) await enviarAn8n({ telefono, nombre, mensaje });
  }

  revalidatePath("/admin/preventa");
}

/** Registra el resultado de una preventa (pedido / visita / no necesita / sin respuesta). */
export async function marcarResultado(formData: FormData) {
  const preventaId = String(formData.get("preventaId") ?? "").trim();
  const estado = String(formData.get("estado") ?? "").trim();
  if (!preventaId || !esEstadoPreventa(estado)) return;

  const preventa = await prisma.preventa.update({ where: { id: preventaId }, data: { estado } });
  await prisma.actividad.create({
    data: { negocioId: preventa.negocioId, tipo: "contacto", descripcion: `Preventa: ${estado}` },
  });

  revalidatePath("/admin/preventa");
}

/** Elimina un registro de preventa. */
export async function eliminarPreventa(formData: FormData) {
  const preventaId = String(formData.get("preventaId") ?? "").trim();
  if (!preventaId) return;
  await prisma.preventa.delete({ where: { id: preventaId } });
  revalidatePath("/admin/preventa");
}
