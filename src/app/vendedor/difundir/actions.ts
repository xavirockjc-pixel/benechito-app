"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { enviarWhatsApp } from "@/lib/whatsapp";
import { rutaDeComuna } from "@/lib/dominio/sectores";

/**
 * Envía un mensaje masivo (promo / recordar / agendar ruta) a los clientes desde el
 * número Benechito (central), no desde el teléfono de quien lo dispara. Filtra por
 * ruta si se indica. `{nombre}` se reemplaza por cada cliente. Sirve para avisar la
 * ruta y pedir que agenden/confirmen, todo desde un solo contacto.
 */
export async function enviarMensajeMasivo(formData: FormData) {
  const texto = String(formData.get("texto") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim();
  const sector = String(formData.get("sector") ?? "").trim(); // etiqueta de ruta, o "" = todos
  if (!texto) return;

  const negocios = await prisma.negocio.findMany({
    where: { nombreNegocio: { not: "Consumidor Final" } },
    select: { id: true, nombreNegocio: true, nombreContacto: true, whatsapp: true, comuna: true, sector: true },
    take: 2000,
  });

  let enviados = 0;
  for (const n of negocios) {
    const tel = (n.whatsapp || "").replace(/\D/g, "");
    if (!tel) continue;
    if (sector && rutaDeComuna(n.sector || n.comuna).label !== sector) continue;
    const nombre = n.nombreContacto || n.nombreNegocio || "";
    const corto = nombre.split(" ")[0] || nombre;
    const mensaje = texto.replaceAll("{nombre}", corto) + (link ? `\n${link}` : "");
    const r = await enviarWhatsApp({ telefono: tel, nombre, mensaje });
    if (r.ok) enviados++;
  }

  redirect(`/vendedor/difundir?enviados=${enviados}`);
}

/** Guarda el día de la semana de cada ruta (dia_<clave> = 0..6, o "" = sin día). */
export async function guardarAgendaRutas(formData: FormData) {
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("dia_")) continue;
    const ruta = k.slice(4);
    const val = String(v).trim();
    if (val === "") {
      await prisma.rutaDia.delete({ where: { ruta } }).catch(() => {});
    } else {
      const dia = Math.min(6, Math.max(0, Number(val) || 0));
      await prisma.rutaDia.upsert({ where: { ruta }, update: { dia }, create: { ruta, dia } }).catch(() => {});
    }
  }
  redirect("/vendedor/preventa?guardado=1");
}

/**
 * Envía la PREVENTA a los clientes de una ruta desde el número Benechito: les avisa
 * que pasamos (mañana / pronto) para que dejen su pedido. `{nombre}` se reemplaza.
 */
export async function enviarPreventaRuta(formData: FormData) {
  const rutaClave = String(formData.get("ruta") ?? "").trim();
  const texto = String(formData.get("texto") ?? "").trim()
    || "🐝 ¡Hola {nombre}! Mañana pasamos por tu sector con los helados Benechito 🍦. ¿Te dejo tu pedido? Avísame qué necesitas.";
  if (!rutaClave) return;

  const negocios = await prisma.negocio.findMany({
    where: { nombreNegocio: { not: "Consumidor Final" } },
    select: { nombreNegocio: true, nombreContacto: true, whatsapp: true, comuna: true, sector: true },
    take: 2000,
  });

  let enviados = 0;
  for (const n of negocios) {
    const tel = (n.whatsapp || "").replace(/\D/g, "");
    if (!tel) continue;
    if (rutaDeComuna(n.sector || n.comuna).clave !== rutaClave) continue;
    const nombre = n.nombreContacto || n.nombreNegocio || "";
    const mensaje = texto.replaceAll("{nombre}", nombre.split(" ")[0] || nombre);
    const r = await enviarWhatsApp({ telefono: tel, nombre, mensaje });
    if (r.ok) enviados++;
  }
  redirect(`/vendedor/preventa?enviados=${enviados}&ruta=${encodeURIComponent(rutaClave)}`);
}
