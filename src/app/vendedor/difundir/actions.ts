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
