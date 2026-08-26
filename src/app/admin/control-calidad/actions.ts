"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";

/** Registra a qué cliente se despachó un lote de producción (trazabilidad → cliente). */
export async function registrarDespachoLote(formData: FormData) {
  const controlId = String(formData.get("controlId") ?? "").trim();
  const negocioId = String(formData.get("negocioId") ?? "").trim() || null;
  const clienteTexto = String(formData.get("clienteTexto") ?? "").trim() || null;
  const cantidad = Number(String(formData.get("cantidad") ?? "0").replace(",", ".")) || 0;
  const notas = String(formData.get("notas") ?? "").trim() || null;
  if (!controlId || (!negocioId && !clienteTexto)) return;

  const u = await usuarioActual();
  await prisma.despachoLote.create({
    data: {
      controlId, negocioId, clienteTexto: negocioId ? null : clienteTexto,
      cantidad: cantidad > 0 ? cantidad : 0, notas,
      usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
    },
  });
  revalidatePath(`/admin/control-calidad/${controlId}`);
}

/** Elimina un registro de despacho de lote. */
export async function eliminarDespachoLote(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const controlId = String(formData.get("controlId") ?? "").trim();
  if (!id) return;
  await prisma.despachoLote.delete({ where: { id } });
  if (controlId) revalidatePath(`/admin/control-calidad/${controlId}`);
}
