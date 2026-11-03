"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { reemitirDocumento } from "@/lib/facturacion";

/** Reintenta la emisión electrónica de UN documento pendiente o rechazado. */
export async function reintentarEmision(formData: FormData) {
  const documentoId = String(formData.get("documentoId") ?? "").trim();
  if (!documentoId) return;
  await reemitirDocumento(documentoId);
  revalidatePath("/admin/facturacion");
}

/** Reintenta TODOS los documentos pendientes/rechazados (hasta 50 por tanda). */
export async function reintentarPendientes() {
  if (!process.env.SII_N8N_WEBHOOK_URL) return;
  const docs = await prisma.documentoVenta.findMany({
    where: { estado: { in: ["pendiente", "rechazado"] }, tipo: { in: ["boleta", "factura"] } },
    orderBy: { createdAt: "asc" },
    take: 50,
    select: { id: true },
  });
  for (const d of docs) await reemitirDocumento(d.id);
  revalidatePath("/admin/facturacion");
}

/** Token público para el enlace de la factura que se le manda al cliente. */
function nuevoEnlace() {
  return randomBytes(12).toString("hex");
}

/** Marca una venta como facturada (folio + pantallazo opcional del comprobante). */
export async function marcarFacturada(formData: FormData) {
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  const folio = String(formData.get("folio") ?? "").trim() || null;
  const foto = String(formData.get("foto") ?? "").trim();
  const urlPdf = foto.startsWith("data:image") ? foto : null;
  if (!ventaId) return;

  const venta = await prisma.venta.findUnique({ where: { id: ventaId }, select: { total: true, negocioId: true } });
  await prisma.venta.update({ where: { id: ventaId }, data: { facturada: true, folioFactura: folio } });
  // Factura emitida → borra el recordatorio "falta facturar" de la ficha del cliente.
  if (venta?.negocioId) await prisma.negocio.update({ where: { id: venta.negocioId }, data: { facturarPendiente: false, facturarNota: null } }).catch(() => {});

  const total = Number(venta?.total ?? 0);
  const neto = Math.round(total / 1.19);
  const iva = total - neto;

  // Sincroniza (o crea) el DocumentoVenta de la venta, dejándole su enlace público.
  const doc = await prisma.documentoVenta.findFirst({ where: { ventaId }, orderBy: { createdAt: "desc" } });
  if (doc) {
    await prisma.documentoVenta.update({
      where: { id: doc.id },
      data: { estado: "emitido", tipo: "factura", ...(folio ? { folio } : {}), montoNeto: neto, iva, montoTotal: total, ...(urlPdf ? { urlPdf } : {}), fechaEmision: doc.fechaEmision ?? new Date(), ...(doc.enlaceToken ? {} : { enlaceToken: nuevoEnlace() }) },
    });
  } else if (venta) {
    await prisma.documentoVenta.create({
      data: { ventaId, negocioId: venta.negocioId, tipo: "factura", estado: "emitido", folio, montoNeto: neto, iva, montoTotal: total, urlPdf, fechaEmision: new Date(), enlaceToken: nuevoEnlace() },
    });
  }
  revalidatePath("/admin/facturacion");
}

/**
 * Prepara el envío de una factura al cliente: asegura el enlace público, marca
 * fechaEnvio/canal y devuelve el token para armar el link con seguimiento.
 * Lo llama el botón de WhatsApp/correo del panel antes de abrir el mensaje.
 */
export async function prepararEnvio(ventaId: string, canal: "whatsapp" | "email"): Promise<{ token: string } | null> {
  const id = String(ventaId ?? "").trim();
  if (!id) return null;
  const venta = await prisma.venta.findUnique({ where: { id }, select: { total: true, negocioId: true } });
  if (!venta) return null;

  let doc = await prisma.documentoVenta.findFirst({ where: { ventaId: id }, orderBy: { createdAt: "desc" } });
  if (!doc) {
    const total = Number(venta.total);
    const neto = Math.round(total / 1.19);
    doc = await prisma.documentoVenta.create({
      data: { ventaId: id, negocioId: venta.negocioId, tipo: "factura", estado: "emitido", montoNeto: neto, iva: total - neto, montoTotal: total, fechaEmision: new Date(), enlaceToken: nuevoEnlace() },
    });
  }
  const token = doc.enlaceToken ?? nuevoEnlace();
  await prisma.documentoVenta.update({
    where: { id: doc.id },
    data: { enlaceToken: token, canalEnvio: canal, fechaEnvio: doc.fechaEnvio ?? new Date(), estado: doc.estado === "pendiente" ? "enviado" : doc.estado },
  });
  revalidatePath("/admin/facturacion");
  return { token };
}

/** Deshace la marca de facturada. */
export async function desmarcarFacturada(formData: FormData) {
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  if (!ventaId) return;
  await prisma.venta.update({ where: { id: ventaId }, data: { facturada: false, folioFactura: null } });
  const doc = await prisma.documentoVenta.findFirst({ where: { ventaId }, orderBy: { createdAt: "desc" } });
  if (doc) {
    await prisma.documentoVenta.update({ where: { id: doc.id }, data: { estado: "pendiente", folio: null } });
  }
  revalidatePath("/admin/facturacion");
}
