"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Ejecuta un comando de voz YA interpretado y confirmado por el usuario. */
export async function ejecutarComando(formData: FormData) {
  const intent = val(formData, "intent");
  const clase = val(formData, "clase"); // producto | sabor
  const refId = val(formData, "refId");
  const cantidad = Number(val(formData, "cantidad"));

  if (intent === "orden") {
    if (!refId || !Number.isFinite(cantidad) || cantidad <= 0) return;
    await prisma.ordenProduccion.create({
      data: {
        productoId: clase === "producto" ? refId : null,
        saborId: clase === "sabor" ? refId : null,
        cantidadPlan: cantidad,
        notas: "Creada por comando de voz",
        estado: "planificada",
      },
    });
    revalidatePath("/admin/produccion");
    redirect("/admin/voz?ok=" + encodeURIComponent("Orden de producción creada"));
  }

  if (intent === "agenda") {
    const titulo = val(formData, "titulo") || "Agendado por voz";
    const tipo = val(formData, "tipo") || "otro";
    const fecha = val(formData, "fecha");
    if (!fecha) return;
    await prisma.agenda.create({
      data: {
        titulo,
        fecha: new Date(fecha + "T12:00:00"),
        tipo,
        productoId: clase === "producto" ? refId || null : null,
        saborId: clase === "sabor" ? refId || null : null,
        cantidad: Number.isFinite(cantidad) && cantidad > 0 ? cantidad : null,
        notas: "Agendado por comando de voz",
      },
    });
    revalidatePath("/admin/agenda");
    redirect("/admin/voz?ok=" + encodeURIComponent("Agregado a la agenda"));
  }
}
