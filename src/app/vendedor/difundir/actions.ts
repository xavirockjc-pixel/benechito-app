"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { enviarWhatsApp } from "@/lib/whatsapp";
import { rutaDeComuna } from "@/lib/dominio/sectores";
import { baseUrl } from "@/lib/base-url";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/** Texto del día de una ruta: "hoy" / "mañana" / "el jueves" según RutaDia. */
function diaTexto(dia: number | null | undefined): string {
  if (dia == null) return "pronto";
  const hoy = new Date().getDay();
  if (dia === hoy) return "hoy";
  if (dia === (hoy + 1) % 7) return "mañana";
  return `el ${DIAS[dia]}`;
}

/** Devuelve el portalToken del negocio, generándolo si falta (para armar su link). */
async function tokenDe(negocioId: string, actual: string | null): Promise<string | null> {
  if (actual) return actual;
  const t = randomBytes(12).toString("hex");
  try {
    await prisma.negocio.update({ where: { id: negocioId }, data: { portalToken: t } });
    return t;
  } catch {
    return null;
  }
}

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
 * que pasamos y les manda su LINK personal para que dejen pedido o digan que pasan.
 * Reemplaza `{nombre}`, `{dia}` y `{link}`. Deja registrada cada preventa (enviada).
 */
export async function enviarPreventaRuta(formData: FormData) {
  const rutaClave = String(formData.get("ruta") ?? "").trim();
  const texto = String(formData.get("texto") ?? "").trim()
    || "🐝 ¡Hola {nombre}! {dia} pasamos por tu sector con los helados Benechito 🍦.\n¿Qué necesitas? Déjame tu pedido o dime si esta vez pasas aquí 👉 {link}";
  if (!rutaClave) return;

  const [negocios, rutaDia, base] = await Promise.all([
    prisma.negocio.findMany({
      where: { nombreNegocio: { not: "Consumidor Final" } },
      select: { id: true, nombreNegocio: true, nombreContacto: true, whatsapp: true, comuna: true, sector: true, portalToken: true },
      take: 2000,
    }),
    prisma.rutaDia.findUnique({ where: { ruta: rutaClave } }).catch(() => null),
    baseUrl(),
  ]);
  const dia = diaTexto(rutaDia?.dia);

  let enviados = 0;
  for (const n of negocios) {
    const tel = (n.whatsapp || "").replace(/\D/g, "");
    if (!tel) continue;
    if (rutaDeComuna(n.sector || n.comuna).clave !== rutaClave) continue;
    const nombre = n.nombreContacto || n.nombreNegocio || "";
    const token = await tokenDe(n.id, n.portalToken);
    const link = token && base ? `${base}/preventa/${token}` : "";
    const mensaje = texto.replaceAll("{nombre}", nombre.split(" ")[0] || nombre).replaceAll("{dia}", dia).replaceAll("{link}", link);
    const r = await enviarWhatsApp({ telefono: tel, nombre, mensaje });
    if (r.ok) {
      enviados++;
      await prisma.preventa.create({ data: { negocioId: n.id, estado: "enviada", mensaje } }).catch(() => {});
    }
  }
  redirect(`/vendedor/preventa?enviados=${enviados}&ruta=${encodeURIComponent(rutaClave)}`);
}

/** Envía la preventa a UN cliente (botón "💬 Avisar" en la lista de la ruta). */
export async function enviarPreventaCliente(formData: FormData) {
  const negocioId = String(formData.get("negocioId") ?? "").trim();
  const rutaClave = String(formData.get("ruta") ?? "").trim();
  if (!negocioId) return;

  const n = await prisma.negocio.findUnique({
    where: { id: negocioId },
    select: { id: true, nombreNegocio: true, nombreContacto: true, whatsapp: true, comuna: true, sector: true, portalToken: true },
  });
  const tel = (n?.whatsapp || "").replace(/\D/g, "");
  if (!n || !tel) { redirect(`/vendedor/preventa?ruta=${encodeURIComponent(rutaClave)}&sintel=1`); }

  const clave = rutaDeComuna(n!.sector || n!.comuna).clave;
  const [rutaDia, base] = await Promise.all([
    prisma.rutaDia.findUnique({ where: { ruta: clave } }).catch(() => null),
    baseUrl(),
  ]);
  const nombre = n!.nombreContacto || n!.nombreNegocio || "";
  const token = await tokenDe(n!.id, n!.portalToken);
  const link = token && base ? `${base}/preventa/${token}` : "";
  const mensaje = `🐝 ¡Hola ${nombre.split(" ")[0] || nombre}! ${diaTexto(rutaDia?.dia).replace(/^el /, "este ")} pasamos por tu sector con los helados Benechito 🍦.\n¿Qué necesitas? Déjame tu pedido o dime si esta vez pasas aquí 👉 ${link}`;
  const r = await enviarWhatsApp({ telefono: tel, nombre, mensaje });
  if (r.ok) await prisma.preventa.create({ data: { negocioId: n!.id, estado: "enviada", mensaje } }).catch(() => {});

  redirect(`/vendedor/preventa?ruta=${encodeURIComponent(rutaClave)}&uno=${r.ok ? 1 : 0}`);
}

/** Marca una respuesta de preventa como atendida (el vendedor ya la gestionó). */
export async function marcarPreventaAtendida(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.preventa.update({ where: { id }, data: { atendida: true } }).catch(() => {});
  revalidatePath("/vendedor/preventa");
}
