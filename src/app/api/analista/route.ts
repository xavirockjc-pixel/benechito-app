import { NextRequest, NextResponse } from "next/server";
import { analizarNegocio } from "@/lib/dominio/analista";
import { notificarTelegram } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Bot analista. Lo llama un cron (EasyPanel/n8n) y manda el resumen+avisos por
 * Telegram. Protegido por REPORTE_TOKEN (query ?token= o header x-report-token).
 *
 *   GET /api/analista?token=XXXX            → resumen del día (siempre envía)
 *   GET /api/analista?token=XXXX&modo=alertas → solo envía si HAY avisos (para
 *                                               llamarlo varias veces al día sin spamear)
 *
 * Responde { ok, enviado, texto } (si no hay Telegram configurado, enviado=false
 * pero igual devuelve el texto para que n8n lo mande por WhatsApp).
 */
export async function GET(req: NextRequest) {
  const need = process.env.REPORTE_TOKEN;
  if (need) {
    const got = req.nextUrl.searchParams.get("token") || req.headers.get("x-report-token") || "";
    if (got !== need) return NextResponse.json({ ok: false, error: "token" }, { status: 401 });
  }

  const modo = req.nextUrl.searchParams.get("modo") || "resumen";

  try {
    const a = await analizarNegocio();
    // En modo "alertas" solo se envía si hay algo accionable (alerta/aviso).
    const hayAccionable = a.alertas.some((x) => x.tono === "alerta" || x.tono === "aviso") || a.facturasPorEnviar > 0;
    const debeEnviar = modo !== "alertas" || hayAccionable;

    let enviado = false;
    if (debeEnviar && (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)) {
      await notificarTelegram(a.texto);
      enviado = true;
    }
    return NextResponse.json({ ok: true, enviado, modo, texto: a.texto });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
