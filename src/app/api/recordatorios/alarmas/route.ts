import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Alarmas de recordatorios "a su hora". n8n lo llama cada ~10-15 min y envía
 * `texto` por Telegram/WhatsApp. Devuelve los recordatorios/tareas cuya hora ya
 * llegó (fechaObjetivo <= ahora), sin cerrar y sin avisar; y los marca como
 * avisados para no repetir.
 *
 * Uso:  GET /api/recordatorios/alarmas?token=XXXX
 *   - Con ?dry=1 no marca como avisado (para probar sin "gastar" el aviso).
 */
export async function GET(req: NextRequest) {
  const need = process.env.REPORTE_TOKEN;
  if (need) {
    const got = req.nextUrl.searchParams.get("token") || req.headers.get("x-report-token") || "";
    if (got !== need) return NextResponse.json({ ok: false, error: "token" }, { status: 401 });
  }
  const dry = req.nextUrl.searchParams.get("dry") === "1";
  const ahora = new Date();

  let vencidos: { id: string; texto: string; fechaObjetivo: Date | null; autor: string | null }[] = [];
  try {
    vencidos = await prisma.nota.findMany({
      where: {
        estado: { not: "hecha" },
        tipo: { in: ["recordatorio", "tarea"] },
        fechaObjetivo: { not: null, lte: ahora },
        avisadoEn: null,
      },
      orderBy: { fechaObjetivo: "asc" },
      take: 20,
      select: { id: true, texto: true, fechaObjetivo: true, autor: true },
    });
  } catch {
    return NextResponse.json({ ok: true, total: 0, texto: "", items: [] });
  }

  if (vencidos.length === 0) return NextResponse.json({ ok: true, total: 0, texto: "", items: [] });

  const hhmm = (d: Date | null) => (d ? new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "");
  const L = ["⏰ *Recordatorio Benechito*", ""];
  for (const r of vencidos) L.push(`🔔 ${r.texto}${r.fechaObjetivo ? ` — ${hhmm(r.fechaObjetivo)}` : ""}`);

  // Marca como avisados (salvo prueba) para no repetir.
  if (!dry) {
    try { await prisma.nota.updateMany({ where: { id: { in: vencidos.map((v) => v.id) } }, data: { avisadoEn: ahora } }); } catch { /* si falla, se reintenta en el próximo ciclo */ }
  }

  return NextResponse.json({
    ok: true,
    total: vencidos.length,
    texto: L.join("\n"),
    items: vencidos.map((r) => ({ id: r.id, texto: r.texto, hora: hhmm(r.fechaObjetivo), autor: r.autor })),
  });
}
