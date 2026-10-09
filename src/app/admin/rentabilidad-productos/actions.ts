"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { LINEAS_COSTEABLES } from "@/lib/dominio/costeo";

const money = (v: FormDataEntryValue | null): number | null => {
  const n = Number(String(v ?? "").replace(/[^0-9]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Guarda/actualiza los valores por unidad de una línea (pago, precio, costo). */
export async function guardarCostoLinea(formData: FormData) {
  const linea = String(formData.get("linea") ?? "").trim();
  if (!(LINEAS_COSTEABLES as readonly string[]).includes(linea)) return;
  const pagoUnit = money(formData.get("pagoUnit"));
  const precioVenta = money(formData.get("precioVenta"));
  const costoReal = money(formData.get("costoReal"));
  await prisma.costoLinea.upsert({
    where: { linea },
    update: { pagoUnit, precioVenta, costoReal },
    create: { linea, pagoUnit, precioVenta, costoReal },
  });
  revalidatePath("/admin/rentabilidad-productos");
}
