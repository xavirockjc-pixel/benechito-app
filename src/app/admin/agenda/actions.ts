"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Crea una entrada de agenda (pedido agendado). El objetivo es "prod:<id>" o "sab:<id>" o vacío. */
export async function crearAgenda(formData: FormData) {
  const titulo = val(formData, "titulo");
  const fechaStr = val(formData, "fecha");
  const tipo = val(formData, "tipo") || "otro";
  if (!titulo || !fechaStr) return;

  const objetivo = val(formData, "objetivo"); // "prod:xxx" | "sab:yyy" | ""
  const [k, refId] = objetivo.split(":");
  const cantRaw = Number(val(formData, "cantidad"));
  const cantidad = Number.isFinite(cantRaw) && cantRaw > 0 ? cantRaw : null;

  await prisma.agenda.create({
    data: {
      titulo,
      fecha: new Date(fechaStr + "T12:00:00"),
      tipo,
      negocioId: val(formData, "negocioId") || null,
      productoId: k === "prod" ? refId : null,
      saborId: k === "sab" ? refId : null,
      cantidad,
      notas: val(formData, "notas") || null,
    },
  });

  revalidatePath("/admin/agenda");
}

/** Cambia el estado de una entrada (pendiente|en_proceso|hecho|cancelado). */
export async function cambiarEstadoAgenda(formData: FormData) {
  const id = val(formData, "id");
  const estado = val(formData, "estado");
  if (!id || !["pendiente", "en_proceso", "hecho", "cancelado"].includes(estado)) return;
  await prisma.agenda.update({ where: { id }, data: { estado } });
  revalidatePath("/admin/agenda");
}

/** Elimina una entrada de la agenda. */
export async function eliminarAgenda(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  await prisma.agenda.delete({ where: { id } });
  revalidatePath("/admin/agenda");
}

/**
 * "Mandar a fabricar": crea una Orden de Producción desde la entrada de agenda
 * (si tiene producto o sabor + cantidad) y la marca en proceso. La orden aparece
 * en la app de Producción.
 */
export async function mandarAFabricar(formData: FormData) {
  const id = val(formData, "id");
  if (!id) return;
  const a = await prisma.agenda.findUnique({ where: { id } });
  if (!a || (!a.productoId && !a.saborId) || !a.cantidad) return;

  await prisma.ordenProduccion.create({
    data: {
      productoId: a.productoId,
      saborId: a.saborId,
      cantidadPlan: a.cantidad,
      notas: `Agenda: ${a.titulo}`,
      estado: "planificada",
    },
  });
  await prisma.agenda.update({ where: { id }, data: { estado: "en_proceso" } });

  revalidatePath("/admin/agenda");
  revalidatePath("/admin/produccion");
}
