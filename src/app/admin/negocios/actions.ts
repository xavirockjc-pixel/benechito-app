"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { esEstado, estadoMeta, type Estado } from "@/lib/estados";

/** Alta manual de un negocio desde el panel. */
export async function crearNegocio(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return v ? String(v).trim() : "";
  };

  if (!get("nombreContacto") || !get("nombreNegocio") || !get("whatsapp") || !get("comuna")) {
    return; // validación mínima; la UI marca required
  }

  const estadoInput = get("estado");
  const estado: Estado = esEstado(estadoInput) ? estadoInput : "nuevo";

  const negocio = await prisma.negocio.create({
    data: {
      nombreContacto: get("nombreContacto"),
      nombreNegocio: get("nombreNegocio"),
      whatsapp: get("whatsapp"),
      comuna: get("comuna"),
      ciudad: get("ciudad") || null,
      tipoNegocio: get("tipoNegocio") || null,
      direccion: get("direccion") || null,
      interesHelados: formData.get("interesHelados") === "si",
      observaciones: get("observaciones") || null,
      estado,
      origen: "manual",
      actividades: {
        create: { tipo: "creado", descripcion: "Negocio creado manualmente" },
      },
    },
  });

  redirect(`/admin/negocios/${negocio.id}`);
}

/** Cambia el estado comercial y registra la actividad. */
export async function cambiarEstado(formData: FormData) {
  const id = String(formData.get("id"));
  const nuevo = String(formData.get("estado"));
  if (!esEstado(nuevo)) return;

  const data: Record<string, unknown> = { estado: nuevo };
  // Al instalar, registrar fecha de instalación si no existe
  if (nuevo === "punto_activo") {
    const actual = await prisma.negocio.findUnique({ where: { id } });
    if (actual && !actual.fechaInstalacion) data.fechaInstalacion = new Date();
  }

  await prisma.negocio.update({ where: { id }, data });
  await prisma.actividad.create({
    data: {
      negocioId: id,
      tipo: "cambio_estado",
      descripcion: `Estado cambiado a "${estadoMeta[nuevo].label}"`,
    },
  });

  revalidatePath(`/admin/negocios/${id}`);
  revalidatePath("/admin");
}

/** Agrega una nota al historial del negocio. */
export async function agregarNota(formData: FormData) {
  const id = String(formData.get("id"));
  const texto = String(formData.get("nota") ?? "").trim();
  if (!texto) return;

  await prisma.actividad.create({
    data: { negocioId: id, tipo: "nota", descripcion: texto },
  });
  revalidatePath(`/admin/negocios/${id}`);
}

/** Registra una reposición y actualiza fechas. */
export async function registrarReposicion(formData: FormData) {
  const id = String(formData.get("id"));
  const notas = String(formData.get("notas") ?? "").trim() || null;
  const proximaStr = String(formData.get("proxima") ?? "").trim();
  const proxima = proximaStr ? new Date(proximaStr) : null;

  await prisma.reposicion.create({ data: { negocioId: id, notas } });
  await prisma.negocio.update({
    where: { id },
    data: {
      ultimaReposicion: new Date(),
      proximaReposicion: proxima,
      // si estaba activo, lo dejamos como reposición reciente
    },
  });
  await prisma.actividad.create({
    data: {
      negocioId: id,
      tipo: "reposicion",
      descripcion: notas ? `Reposición registrada: ${notas}` : "Reposición registrada",
    },
  });

  revalidatePath(`/admin/negocios/${id}`);
  revalidatePath("/admin/reposiciones");
}

/** Edición de los datos de contacto del cliente. */
export async function actualizarNegocio(formData: FormData) {
  const id = String(formData.get("id"));
  const get = (k: string) => {
    const v = formData.get(k);
    return v ? String(v).trim() : "";
  };
  if (!id || !get("nombreContacto") || !get("nombreNegocio")) return;

  await prisma.negocio.update({
    where: { id },
    data: {
      nombreContacto: get("nombreContacto"),
      nombreNegocio: get("nombreNegocio"),
      whatsapp: get("whatsapp"),
      comuna: get("comuna"),
      ciudad: get("ciudad") || null,
      tipoNegocio: get("tipoNegocio") || null,
      direccion: get("direccion") || null,
      interesHelados: formData.get("interesHelados") === "si",
      observaciones: get("observaciones") || null,
    },
  });

  revalidatePath(`/admin/negocios/${id}`);
  redirect(`/admin/negocios/${id}`);
}

/** Actualiza la clasificación comercial (tipo de cliente y lista de precios asignada). */
export async function actualizarClasificacion(formData: FormData) {
  const id = String(formData.get("id"));
  const tipoCliente = String(formData.get("tipoCliente") ?? "").trim();
  const listaPrecioId = String(formData.get("listaPrecioId") ?? "").trim() || null;
  if (!id || !tipoCliente) return;

  await prisma.negocio.update({
    where: { id },
    data: { tipoCliente, listaPrecioId },
  });
  await prisma.actividad.create({
    data: {
      negocioId: id,
      tipo: "nota",
      descripcion: `Clasificación actualizada: tipo "${tipoCliente}"${
        listaPrecioId ? " con lista de precios asignada" : " (lista automática por canal)"
      }`,
    },
  });

  revalidatePath(`/admin/negocios/${id}`);
}

/** Elimina un negocio (y su historial en cascada). */
export async function eliminarNegocio(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.negocio.delete({ where: { id } });
  redirect("/admin/negocios");
}
