"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Number(val(fd, k));

/** Crea una orden de producción (planificada). */
export async function crearOP(formData: FormData) {
  const productoId = val(formData, "productoId");
  const cantidadPlan = num(formData, "cantidadPlan");
  if (!productoId || !Number.isFinite(cantidadPlan) || cantidadPlan <= 0) return;

  const op = await prisma.ordenProduccion.create({
    data: {
      productoId,
      cantidadPlan,
      lote: val(formData, "lote") || null,
      responsable: val(formData, "responsable") || null,
      notas: val(formData, "notas") || null,
      estado: "planificada",
    },
  });

  revalidatePath("/admin/produccion");
  redirect(`/admin/produccion/${op.id}`);
}

/** Marca la OP como en proceso. */
export async function iniciarOP(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.ordenProduccion.update({ where: { id }, data: { estado: "en_proceso" } });
  revalidatePath(`/admin/produccion/${id}`);
  revalidatePath("/admin/produccion");
}

/**
 * Termina la OP: registra producción real y merma, y hace el INGRESO del producto
 * terminado a bodega (Stock += cantidadReal, MovimientoStock tipo "produccion").
 */
export async function terminarOP(formData: FormData) {
  const id = val(formData, "id");
  const cantidadReal = num(formData, "cantidadReal");
  const merma = Number.isFinite(num(formData, "merma")) ? Math.max(0, num(formData, "merma")) : 0;
  if (!id || !Number.isFinite(cantidadReal) || cantidadReal < 0) return;

  const op = await prisma.ordenProduccion.findUnique({ where: { id } });
  if (!op || op.estado === "terminada") return;

  // Ubicación destino: la indicada, o la primera bodega.
  const destinoId =
    val(formData, "ubicacionDestinoId") ||
    (await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } }))?.id ||
    (await prisma.ubicacion.findFirst())?.id;

  await prisma.ordenProduccion.update({
    where: { id },
    data: {
      cantidadReal,
      merma,
      estado: "terminada",
      fechaTermino: new Date(),
      ubicacionDestinoId: destinoId ?? null,
    },
  });

  // Ingreso a bodega del producto terminado.
  if (destinoId && cantidadReal > 0) {
    await prisma.stock.upsert({
      where: { productoId_ubicacionId: { productoId: op.productoId, ubicacionId: destinoId } },
      update: { cantidad: { increment: cantidadReal } },
      create: { productoId: op.productoId, ubicacionId: destinoId, cantidad: cantidadReal },
    });
    await prisma.movimientoStock.create({
      data: {
        productoId: op.productoId,
        tipo: "produccion",
        ubicacionDestinoId: destinoId,
        cantidad: cantidadReal,
        referencia: op.id,
      },
    });
  }

  revalidatePath(`/admin/produccion/${id}`);
  revalidatePath("/admin/produccion");
  revalidatePath("/admin/inventario");
}

/** Elimina una OP (no revierte stock ya ingresado). */
export async function eliminarOP(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.ordenProduccion.delete({ where: { id } });
  revalidatePath("/admin/produccion");
  redirect("/admin/produccion");
}
