"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** Pone o saca a un cliente de "en pausa" (piloto / producto no validado). */
export async function toggleNoCobrar(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  if (!negocioId) return;
  const pausar = String(formData.get("pausar") ?? "") === "true";
  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  await prisma.negocio.update({
    where: { id: negocioId },
    data: { noCobrar: pausar, motivoNoCobrar: pausar ? motivo : null },
  });
  revalidatePath("/admin/cobranza");
}
