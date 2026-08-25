"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Marca una venta como facturada (opcionalmente con el folio). */
export async function marcarFacturada(formData: FormData) {
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  const folio = String(formData.get("folio") ?? "").trim() || null;
  if (!ventaId) return;
  await prisma.venta.update({ where: { id: ventaId }, data: { facturada: true, folioFactura: folio } });
  revalidatePath("/admin/facturacion");
}

/** Deshace la marca de facturada. */
export async function desmarcarFacturada(formData: FormData) {
  const ventaId = String(formData.get("ventaId") ?? "").trim();
  if (!ventaId) return;
  await prisma.venta.update({ where: { id: ventaId }, data: { facturada: false, folioFactura: null } });
  revalidatePath("/admin/facturacion");
}
