import { NextRequest, NextResponse } from "next/server";
import { getRecordatorios } from "@/lib/recordatorios";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Recordatorios del día (reposición, cobros, preventa).
 * GET /api/recordatorios?token=XXXX
 *  - Devuelve { ok, total, resumen, items } — n8n envía `resumen` al dueño y,
 *    opcionalmente, `items[]` a cada cliente (whatsapp + mensaje listos).
 */
export async function GET(req: NextRequest) {
  const need = process.env.REPORTE_TOKEN;
  if (need) {
    const got = req.nextUrl.searchParams.get("token") || req.headers.get("x-report-token") || "";
    if (got !== need) return NextResponse.json({ ok: false, error: "token" }, { status: 401 });
  }
  const { reposicion, cobro, preventa, resumen, total } = await getRecordatorios();
  const items = [...reposicion, ...cobro, ...preventa];
  return NextResponse.json({ ok: true, total, resumen, items });
}
