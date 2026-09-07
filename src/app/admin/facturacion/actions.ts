"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Marca una venta como facturada (folio + pantallazo opcional del comprobante). */
export async function marcarFacturada(formData: FormData) {
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  const folio = String(formData.get("folio") ?? "").trim() || null;
  const foto = String(formData.get("foto") ?? "").trim();
  const urlPdf = foto.startsWith("data:image") ? foto : null;
  if (!ventaId) return;

  const venta = await prisma.venta.findUnique({ where: { id: ventaId }, select: { total: true, negocioId: true } });
  await prisma.venta.update({ where: { id: ventaId }, data: { facturada: true, folioFactura: folio } });

  const total = Number(venta?.total ?? 0);
  const neto = Math.round(total / 1.19);
  const iva = total - neto;

  // Sincroniza (o crea) el DocumentoVenta de la venta.
  const doc = await prisma.documentoVenta.findFirst({ where: { ventaId }, orderBy: { createdAt: "desc" } });
  if (doc) {
    await prisma.documentoVenta.update({
      where: { id: doc.id },
      data: { estado: "emitido", tipo: "factura", ...(folio ? { folio } : {}), montoNeto: neto, iva, montoTotal: total, ...(urlPdf ? { urlPdf } : {}), fechaEmision: doc.fechaEmision ?? new Date() },
    });
  } else if (venta) {
    await prisma.documentoVenta.create({
      data: { ventaId, negocioId: venta.negocioId, tipo: "factura", estado: "emitido", folio, montoNeto: neto, iva, montoTotal: total, urlPdf, fechaEmision: new Date() },
    });
  }
  revalidatePath("/admin/facturacion");
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
