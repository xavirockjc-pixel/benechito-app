"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { notificarTelegram } from "@/lib/telegram";

/** Últimos 8 dígitos del teléfono, para no duplicar clientes por el prefijo. */
function colaTelefono(v: string): string {
  return (v || "").replace(/\D/g, "").slice(-8);
}

// Tipo de negocio que se registra → clasificación comercial (lista de precios por defecto).
const TIPO_CLIENTE: Record<string, string> = {
  revendedor: "revendedor",
  distribuidor: "distribuidor",
  negocio: "negocio_retiro",
  otro: "prospecto",
};
const TIPO_LABEL: Record<string, string> = {
  revendedor: "Revendedor / ruta",
  distribuidor: "Distribuidor",
  negocio: "Negocio con local",
  otro: "Otro",
};
const COMPRA_LABEL: Record<string, string> = { dulce: "Dulces", helado: "Helados", ambos: "Dulces y helados" };

/**
 * Registro público desde el Portal de Negocios (/portal). Cualquier revendedor,
 * distribuidor o negocio se da de alta solo; queda como cliente "nuevo" (origen
 * portal) en el CRM y le llega el aviso al dueño por Telegram para aprobarlo.
 */
export async function registrarNegocioPortal(formData: FormData) {
  const nombreNegocio = String(formData.get("nombreNegocio") ?? "").trim();
  const nombreContacto = String(formData.get("nombreContacto") ?? "").trim();
  const whatsapp = String(formData.get("whatsapp") ?? "").trim();
  const comuna = String(formData.get("comuna") ?? "").trim();
  const direccion = String(formData.get("direccion") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "otro").trim();
  const compra = String(formData.get("compra") ?? "").trim(); // dulce | helado | ambos
  const observaciones = String(formData.get("observaciones") ?? "").trim();
  const lat = Number(String(formData.get("lat") ?? "").trim());
  const lng = Number(String(formData.get("lng") ?? "").trim());
  const tieneUbic = Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;

  if (!nombreNegocio || !whatsapp) redirect("/portal?error=datos");

  const tipoCliente = TIPO_CLIENTE[tipo] ?? "prospecto";

  // Evita duplicar: si ya existe un negocio con ese WhatsApp, lo actualiza.
  const cola = colaTelefono(whatsapp);
  const existente = cola.length >= 6
    ? await prisma.negocio.findFirst({ where: { whatsapp: { contains: cola } }, select: { id: true } })
    : null;

  const datos = {
    nombreNegocio,
    nombreContacto: nombreContacto || nombreNegocio,
    whatsapp,
    comuna: comuna || "—",
    direccion: direccion || null,
    tipoCliente,
    compra: compra || null,
    observaciones: observaciones || null,
    ...(tieneUbic ? { latitud: lat, longitud: lng } : {}),
  };

  let negocioId: string;
  if (existente) {
    await prisma.negocio.update({ where: { id: existente.id }, data: datos });
    negocioId = existente.id;
  } else {
    const nuevo = await prisma.negocio.create({
      data: { ...datos, estado: "nuevo", origen: "portal" },
    });
    negocioId = nuevo.id;
  }

  await prisma.actividad.create({
    data: { negocioId, tipo: "registro", descripcion: `Registro por el Portal de Negocios (${TIPO_LABEL[tipo] ?? tipo})` },
  }).catch(() => {});

  // Aviso al dueño para revisar/aprobar al nuevo cliente.
  {
    const ubicMsg = tieneUbic ? `\n📍 Ubicación: https://www.google.com/maps?q=${lat},${lng}` : "";
    await notificarTelegram(
      `🤝 *Nuevo negocio en el Portal · Benechito*\n\n🏪 ${nombreNegocio}\n👤 ${nombreContacto || "—"} · ${whatsapp}\n🏷️ ${TIPO_LABEL[tipo] ?? tipo}${compra ? ` · ${COMPRA_LABEL[compra] ?? compra}` : ""}\n📌 ${comuna || "—"}${direccion ? ` · ${direccion}` : ""}${ubicMsg}${observaciones ? `\n📝 ${observaciones}` : ""}\n\n🐝 Revísalo en benechito.com/admin/negocios`,
    );
  }

  revalidatePath("/admin/negocios");
  redirect("/portal/gracias");
}
