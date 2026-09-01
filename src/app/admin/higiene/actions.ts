"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";

const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Registra una compra de higiene como GASTO y, si se indica, suma stock de un material. */
export async function registrarCompraHigiene(formData: FormData) {
  const concepto = String(formData.get("concepto") ?? "").trim();
  const monto = num(formData.get("monto"));
  const materiaPrimaId = String(formData.get("materiaPrimaId") ?? "").trim();
  const cantidad = num(formData.get("cantidad"));
  const notas = String(formData.get("notas") ?? "").trim() || null;
  if (!concepto || monto <= 0) return;

  await prisma.gasto.create({ data: { concepto, monto, categoria: "higiene", notas } });

  // Enlace opcional con consumo/stock de materiales.
  if (materiaPrimaId && cantidad > 0) {
    const u = await usuarioActual();
    await prisma.movimientoMateria.create({
      data: { materiaPrimaId, tipo: "entrada", cantidad, motivo: `Compra higiene: ${concepto}`, usuarioId: u?.sub ?? null, nombreUsuario: u?.nombre ?? null },
    });
    await prisma.materiaPrima.update({ where: { id: materiaPrimaId }, data: { stock: { increment: cantidad } } });
  }

  revalidatePath("/admin/higiene");
}

export async function crearImplemento(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;
  await prisma.implemento.create({ data: { nombre } });
  revalidatePath("/admin/higiene");
}

export async function toggleImplemento(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const i = await prisma.implemento.findUnique({ where: { id }, select: { activo: true } });
  if (!i) return;
  await prisma.implemento.update({ where: { id }, data: { activo: !i.activo } });
  revalidatePath("/admin/higiene");
}

export async function borrarImplemento(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.implemento.delete({ where: { id } });
  revalidatePath("/admin/higiene");
}

/** Registra la entrega de un implemento a un trabajador. */
export async function registrarEntrega(formData: FormData) {
  const implementoId = String(formData.get("implementoId") ?? "").trim();
  const trabajador = String(formData.get("trabajador") ?? "").trim();
  const cantidad = Math.max(1, Math.round(num(formData.get("cantidad")) || 1));
  const notas = String(formData.get("notas") ?? "").trim() || null;
  if (!implementoId || !trabajador) return;
  const u = await usuarioActual();
  await prisma.entregaImplemento.create({
    data: { implementoId, trabajador, cantidad, notas, usuarioId: u?.sub ?? null, usuarioNombre: u?.nombre ?? null },
  });
  revalidatePath("/admin/higiene");
}
