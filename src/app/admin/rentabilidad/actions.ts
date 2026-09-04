"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Fija (o limpia) el costo de un producto para calcular su margen. */
export async function setCosto(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const raw = String(formData.get("costo") ?? "").replace(/[^\d]/g, "");
  const costo = raw ? Number(raw) : null;
  await prisma.producto.update({ where: { id }, data: { costo } });
  revalidatePath("/admin/rentabilidad");
}
