"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { enviarWhatsApp } from "@/lib/whatsapp";

/** Busca el negocio por su token de portal (link personal). */
async function negocioDeToken(token: string) {
  if (!token) return null;
  return prisma.negocio.findUnique({ where: { portalToken: token }, select: { id: true, nombreNegocio: true, nombreContacto: true } });
}

/** Avisa al vendedor/central (a su WhatsApp) que un cliente respondió la preventa. */
async function avisarVendedor(texto: string) {
  const tel = process.env.NOTIF_VENDEDOR_WHATSAPP || process.env.NOTIF_LOCAL_WHATSAPP || "";
  if (!tel) return;
  await enviarWhatsApp({ telefono: tel, mensaje: texto }).catch(() => {});
}

/**
 * El CLIENTE deja su pedido de preventa desde su link. Guarda la respuesta (estado
 * "pedido" + detalle con lo que eligió) para que el vendedor la vea en la app, y le
 * avisa al vendedor por WhatsApp. No requiere login (acceso por token).
 */
export async function dejarPedidoPreventa(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const detalle = String(formData.get("detalle") ?? "").trim();
  const nota = String(formData.get("nota") ?? "").trim();
  const neg = await negocioDeToken(token);
  if (!neg) return;

  const texto = [detalle, nota && `📝 ${nota}`].filter(Boolean).join("\n") || "Quiere que pasen (sin detalle)";

  await prisma.preventa.create({
    data: { negocioId: neg.id, estado: "pedido", detalle: texto, respondidoEn: new Date(), atendida: false, mensaje: "Respuesta del cliente desde el link" },
  });
  await prisma.actividad.create({ data: { negocioId: neg.id, tipo: "contacto", descripcion: `Preventa: dejó pedido — ${texto.replace(/\n/g, " · ")}` } }).catch(() => {});
  await avisarVendedor(`🛒 ${neg.nombreNegocio} dejó un pedido de preventa:\n${texto}`);

  revalidatePath("/vendedor/preventa");
  revalidatePath("/admin/preventa");
  redirect(`/preventa/${token}?ok=pedido`);
}

/**
 * El CLIENTE dice que esta vez pasa (vuelve a pasar la próxima). Guarda estado
 * "pospone" para que el vendedor no pierda el viaje y sepa a quién reagendar.
 */
export async function posponerPreventa(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const nota = String(formData.get("nota") ?? "").trim();
  const neg = await negocioDeToken(token);
  if (!neg) return;

  await prisma.preventa.create({
    data: { negocioId: neg.id, estado: "pospone", detalle: nota || "Esta vez pasa — vuelvan la próxima.", respondidoEn: new Date(), atendida: false, mensaje: "Respuesta del cliente desde el link" },
  });
  await prisma.actividad.create({ data: { negocioId: neg.id, tipo: "contacto", descripcion: `Preventa: esta vez pasa${nota ? " — " + nota : ""}` } }).catch(() => {});
  await avisarVendedor(`🙅 ${neg.nombreNegocio} esta vez pasa${nota ? `:\n${nota}` : " (vuelvan la próxima)."}`);

  revalidatePath("/vendedor/preventa");
  revalidatePath("/admin/preventa");
  redirect(`/preventa/${token}?ok=pospone`);
}
