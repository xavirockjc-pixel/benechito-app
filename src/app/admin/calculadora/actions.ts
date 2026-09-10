"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const dec = (s: string) => { const n = Number(s.replace(/[^\d.]/g, "")); return Number.isFinite(n) ? n : 0; };
const decOrNull = (s: string) => (s.trim() === "" ? null : dec(s));

/** Crea o actualiza un cálculo (producto o proyecto). */
export async function guardarCalculo(formData: FormData) {
  const id = val(formData, "id");
  const tipo = val(formData, "tipo") === "proyecto" ? "proyecto" : "producto";
  const nombre = val(formData, "nombre");
  if (!nombre) return;

  const data = {
    tipo,
    nombre,
    productoId: val(formData, "productoId") || null,
    precioVenta: decOrNull(val(formData, "precioVenta")),
    rendimiento: val(formData, "rendimiento") ? Math.max(1, Math.floor(dec(val(formData, "rendimiento")))) : null,
    costoExtra: decOrNull(val(formData, "costoExtra")),
    costoCompra: decOrNull(val(formData, "costoCompra")),
    metaUnidades: val(formData, "metaUnidades") ? Math.max(0, Math.floor(dec(val(formData, "metaUnidades")))) : null,
    items: val(formData, "items") || null,
    inversion: decOrNull(val(formData, "inversion")),
    retornoMensual: decOrNull(val(formData, "retornoMensual")),
    notas: val(formData, "notas") || null,
  };

  if (id) await prisma.calculo.update({ where: { id }, data });
  else await prisma.calculo.create({ data });

  revalidatePath("/admin/calculadora");
  redirect("/admin/calculadora");
}

/** Elimina un cálculo. */
export async function eliminarCalculo(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.calculo.delete({ where: { id } });
  revalidatePath("/admin/calculadora");
}
