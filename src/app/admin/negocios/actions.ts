"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { esEstado, estadoMeta, type Estado } from "@/lib/estados";

/**
 * Genera (si no existe) el token del Portal del Cliente para este negocio.
 * El link resultante (/portal/cliente/<token>) se comparte por WhatsApp y el
 * cliente entra sin clave a ver su cuenta y a pedir con su precio.
 */
export async function generarLinkPortal(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  const neg = await prisma.negocio.findUnique({ where: { id }, select: { portalToken: true } });
  if (!neg?.portalToken) {
    await prisma.negocio.update({ where: { id }, data: { portalToken: randomBytes(12).toString("hex") } });
  }
  revalidatePath(`/admin/negocios/${id}`);
}

/**
 * Resuelve un link de Google Maps (o texto "lat,lng") a coordenadas.
 * Funciona con links largos y con los CORTOS (maps.app.goo.gl / goo.gl/maps):
 * los sigue en el servidor (sin CORS) y saca lat/lng de la URL final o del contenido.
 */
export async function resolverLinkMapa(link: string): Promise<{ lat: number; lng: number } | null> {
  const buscar = (s: string): { lat: number; lng: number } | null => {
    const pats = [
      /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
      /!3d(-?\d{1,3}\.\d+)!4d(-?\d{1,3}\.\d+)/,
      /[?&](?:q|ll|daddr|destination)=(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
      /\/(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/,
    ];
    for (const p of pats) { const m = s.match(p); if (m) return { lat: Number(m[1]), lng: Number(m[2]) }; }
    return null;
  };
  const t = (link ?? "").trim();
  if (!t) return null;
  // Texto plano "lat, lng".
  const plano = t.match(/^\s*(-?\d{1,3}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
  if (plano) return { lat: Number(plano[1]), lng: Number(plano[2]) };
  // Intento directo por si el link ya trae coords.
  const directo = buscar(t);
  if (directo) return directo;
  if (!/^https?:\/\//i.test(t)) return null;
  try {
    const res = await fetch(t, { redirect: "follow", headers: { "User-Agent": "Mozilla/5.0" } });
    const porUrl = buscar(res.url);
    if (porUrl) return porUrl;
    const body = await res.text();
    return buscar(body);
  } catch {
    return null;
  }
}

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
      sector: get("sector") || null,
      rut: get("rut") || null,
      razonSocial: get("razonSocial") || null,
      giro: get("giro") || null,
      emailFacturacion: get("emailFacturacion") || null,
      direccionFacturacion: get("direccionFacturacion") || null,
      tipoDocumentoDefault: get("tipoDocumentoDefault") || "boleta",
      requiereFactura: get("tipoDocumentoDefault") === "factura",
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

  // Ubicación GPS (opcional): se puede agregar o corregir después.
  const parseCoord = (k: string) => {
    const v = get(k).replace(",", ".");
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  await prisma.negocio.update({
    where: { id },
    data: {
      nombreContacto: get("nombreContacto"),
      nombreNegocio: get("nombreNegocio"),
      latitud: parseCoord("latitud"),
      longitud: parseCoord("longitud"),
      whatsapp: get("whatsapp"),
      comuna: get("comuna"),
      ciudad: get("ciudad") || null,
      sector: get("sector") || null,
      rut: get("rut") || null,
      razonSocial: get("razonSocial") || null,
      giro: get("giro") || null,
      direccionFacturacion: get("direccionFacturacion") || null,
      emailFacturacion: get("emailFacturacion") || null,
      tipoDocumentoDefault: get("tipoDocumentoDefault") || "boleta",
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
  const compra = String(formData.get("compra") ?? "").trim() || null;
  if (!id || !tipoCliente) return;

  await prisma.negocio.update({
    where: { id },
    data: { tipoCliente, listaPrecioId, compra },
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
