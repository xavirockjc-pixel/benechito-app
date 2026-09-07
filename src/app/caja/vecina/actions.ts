"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { TIPOS_CV } from "@/lib/dominio/caja-vecina";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const numero = (s: string) => Number(s.replace(/[^\d]/g, ""));

/** Registra un movimiento de Caja Vecina (separado de las ventas). */
export async function registrarMovCajaVecina(formData: FormData) {
  const tipoRaw = val(formData, "tipo");
  const tipo = (TIPOS_CV as readonly string[]).includes(tipoRaw) ? tipoRaw : "ajuste";
  const monto = numero(val(formData, "monto"));
  if (!Number.isFinite(monto) || monto <= 0) return;
  const foto = val(formData, "foto");
  const u = await usuarioActual();
  await prisma.movimientoCajaVecina.create({
    data: {
      tipo, monto,
      detalle: val(formData, "detalle") || null,
      foto: foto.startsWith("data:image") ? foto : null,
      usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null,
    },
  });
  revalidatePath("/caja/vecina");
  revalidatePath("/admin/caja-vecina");
}

/** Borra un movimiento de Caja Vecina. */
export async function eliminarMovCajaVecina(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.movimientoCajaVecina.delete({ where: { id } });
  revalidatePath("/caja/vecina");
  revalidatePath("/admin/caja-vecina");
}
