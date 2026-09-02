import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Reporte diario del negocio (el "socio digital").
 * Lee datos reales y arma un resumen para enviar por WhatsApp/correo vía n8n.
 *
 * Uso:  GET /api/reporte/diario?token=XXXX
 *   - Si REPORTE_TOKEN está definido en el entorno, debe coincidir (query ?token= o header x-report-token).
 *   - Devuelve { ok, fecha, texto }.
 *   - n8n (cron diario) lo llama y envía `texto` por Evolution/WhatsApp.
 */
export async function GET(req: NextRequest) {
  // Seguridad opcional por token.
  const need = process.env.REPORTE_TOKEN;
  if (need) {
    const got = req.nextUrl.searchParams.get("token") || req.headers.get("x-report-token") || "";
    if (got !== need) return NextResponse.json({ ok: false, error: "token" }, { status: 401 });
  }

  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);

  // Cada sección va protegida: si un modelo/campo no existe, no rompe el reporte.
  const safe = async <T,>(fn: () => Promise<T>, def: T): Promise<T> => {
    try { return await fn(); } catch { return def; }
  };

  // Ventas de hoy (total + cantidad).
  const ventasHoy = await safe(
    () => prisma.venta.aggregate({ _sum: { total: true }, _count: true, where: { fecha: { gte: inicio } } }),
    { _sum: { total: null }, _count: 0 } as any,
  );
  const totalVentas = Number(ventasHoy._sum.total ?? 0);
  const numVentas = Number(ventasHoy._count ?? 0);

  // Ventas por canal (hoy).
  const porCanal = await safe(
    () => prisma.venta.groupBy({ by: ["canal"], _sum: { total: true }, where: { fecha: { gte: inicio } } }),
    [] as { canal: string; _sum: { total: unknown } }[],
  );

  // Cobrar: ventas con pago pendiente/parcial/vencido (acumulado).
  const porCobrar = await safe(
    () => prisma.venta.aggregate({ _sum: { total: true }, _count: true, where: { estadoPago: { in: ["pendiente", "parcial", "vencido"] } } }),
    { _sum: { total: null }, _count: 0 } as any,
  );

  // Pedidos pendientes (no entregados/finalizados).
  const pedidosPend = await safe(
    () => prisma.pedido.count({ where: { estado: { notIn: ["entregado", "finalizado"] } } }),
    0,
  );

  // Preventa sin cerrar.
  const preventaAbierta = await safe(
    () => prisma.preventa.count({ where: { estado: { in: ["enviada", "sin_respuesta"] } } }),
    0,
  );

  // Caja abierta.
  const cajaAbierta = await safe(() => prisma.sesionCaja.count({ where: { estado: "abierta" } }), 0);

  // Producción terminada hoy.
  const prodHoy = await safe(
    () => prisma.ordenProduccion.aggregate({ _sum: { cantidadReal: true }, where: { estado: "terminada", fechaTermino: { gte: inicio } } }),
    { _sum: { cantidadReal: null } } as any,
  );
  const unidadesProd = Number(prodHoy._sum.cantidadReal ?? 0);

  // Asistencia de hoy.
  const asistHoy = await safe(
    () => prisma.asistencia.aggregate({ _sum: { horas: true }, _count: true, where: { fecha: { gte: inicio }, presente: true } }),
    { _sum: { horas: null }, _count: 0 } as any,
  );

  // Insumos bajo mínimo (compara stock <= stockMinimo en JS).
  const materias = await safe(
    () => prisma.materiaPrima.findMany({ where: { stockMinimo: { gt: 0 } }, select: { nombre: true, stock: true, stockMinimo: true, unidad: true } }),
    [] as { nombre: string; stock: number; stockMinimo: number; unidad: string }[],
  );
  const bajoStock = materias.filter((m) => m.stock <= m.stockMinimo);

  // Mejoras/proyecciones a la vista: pendientes con fecha en los próximos 7 días o vencidas.
  const en7 = new Date(inicio); en7.setDate(en7.getDate() + 7); en7.setHours(23, 59, 59, 999);
  const mejoras = await safe(
    () => prisma.mejora.findMany({
      where: { estado: { not: "hecha" }, fechaObjetivo: { not: null, lte: en7 } },
      orderBy: { fechaObjetivo: "asc" }, take: 6,
      select: { titulo: true, fechaObjetivo: true },
    }),
    [] as { titulo: string; fechaObjetivo: Date | null }[],
  );

  // --- Armado del texto ---
  const fecha = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });
  const L: string[] = [];
  L.push(`☀️ *Reporte Benechito* · ${fecha}`);
  L.push("");
  L.push(`💰 *Ventas de hoy:* ${fmtCLP(totalVentas)} (${numVentas} ${numVentas === 1 ? "venta" : "ventas"})`);
  const canales = porCanal.filter((c) => Number(c._sum.total ?? 0) > 0);
  if (canales.length) {
    L.push(canales.map((c) => `   • ${c.canal}: ${fmtCLP(Number(c._sum.total ?? 0))}`).join("\n"));
  }
  if (unidadesProd > 0) L.push(`🏭 *Producción hoy:* ${unidadesProd} u.`);
  L.push(`👥 *Equipo hoy:* ${Number(asistHoy._count ?? 0)} presentes · ${Number(asistHoy._sum.horas ?? 0)} h`);
  L.push("");
  L.push(`📦 *Pendientes:*`);
  L.push(`   • Pedidos por entregar: ${pedidosPend}`);
  L.push(`   • Preventa sin respuesta: ${preventaAbierta}`);
  L.push(`   • Por cobrar: ${fmtCLP(Number(porCobrar._sum.total ?? 0))} (${Number(porCobrar._count ?? 0)})`);
  L.push(`   • Caja: ${cajaAbierta > 0 ? "⚠️ abierta sin cerrar" : "✅ cerrada"}`);
  if (bajoStock.length) {
    L.push("");
    L.push(`🔴 *Stock bajo (${bajoStock.length}):*`);
    L.push(bajoStock.slice(0, 8).map((m) => `   • ${m.nombre}: ${m.stock} ${m.unidad} (mín ${m.stockMinimo})`).join("\n"));
  }
  if (mejoras.length) {
    L.push("");
    L.push(`🚀 *Mejoras a la vista:*`);
    L.push(mejoras.map((m) => {
      const f = m.fechaObjetivo ? new Date(m.fechaObjetivo) : null;
      const venc = f && f < inicio;
      const fs = f ? f.toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : "";
      return `   • ${m.titulo}${fs ? ` (${venc ? "⚠️ venció " : ""}${fs})` : ""}`;
    }).join("\n"));
  }
  L.push("");
  L.push(`🐝 Tu socio Panal · benechito.com/admin`);

  const texto = L.join("\n");
  return NextResponse.json({ ok: true, fecha, texto });
}
