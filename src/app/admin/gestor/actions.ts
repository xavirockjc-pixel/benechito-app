"use server";

import { usuarioActual } from "@/lib/auth";
import { ROLES_FULL } from "@/lib/dominio/permisos";
import { analizarNegocio } from "@/lib/dominio/analista";
import { notificarTelegram } from "@/lib/telegram";

export type ResultadoAnalista = { ok: boolean; enviado: boolean; texto?: string; error?: string };

/** El dueño pide el resumen del analista ahora y lo manda a su Telegram (si está configurado). */
export async function probarAnalista(): Promise<ResultadoAnalista> {
  const u = await usuarioActual();
  if (!ROLES_FULL.includes(u?.rol ?? "")) return { ok: false, enviado: false, error: "Solo el dueño." };
  const a = await analizarNegocio();
  let enviado = false;
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    await notificarTelegram(a.texto);
    enviado = true;
  }
  return { ok: true, enviado, texto: a.texto };
}
