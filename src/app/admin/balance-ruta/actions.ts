"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numero = (s: string) => Number(s.replace(/[^\d]/g, ""));

/** Registra un flete cobrado (ingreso del reparto). */
export async function registrarFlete(formData: FormData) {
  const monto = numero(val(formData, "monto"));
  if (!Number.isFinite(monto) || monto <= 0) return;
  const fechaStr = val(formData, "fecha");
  const fecha = fechaStr ? new Date(fechaStr) : new Date();
  await prisma.flete.create({
    data: {
      monto,
      destino: val(formData, "destino") || null,
      notas: val(formData, "notas") || null,
      fecha: isNaN(fecha.getTime()) ? new Date() : fecha,
    },
  });
  revalidatePath("/admin/balance-ruta");
}

/** Borra un flete. */
export async function eliminarFlete(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.flete.delete({ where: { id } });
  revalidatePath("/admin/balance-ruta");
}
