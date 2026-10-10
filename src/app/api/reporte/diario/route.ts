import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { lineaLabel } from "@/lib/dominio/produccion";
import { ubicacionProduccionId } from "@/lib/dominio/ubicaciones";

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
  // Día anterior (para el reporte de la mañana: "qué se fabricó ayer").
  const inicioAyer = new Date(inicio.getTime() - 24 * 3600 * 1000);

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

  // Fabricado AYER por TIPO (lo que registró la app de producción). groupBy solo
  // devuelve los tipos con producción → solo aparece lo que de verdad se trabajó.
  const fabAyerTipo = await safe(
    () => prisma.controlCalidad.groupBy({
      by: ["refId"], _sum: { cantidad: true },
      where: { clase: "linea", fecha: { gte: inicioAyer, lt: inicio } },
    }),
    [] as { refId: string | null; _sum: { cantidad: number | null } }[],
  );
  const fabAyer = fabAyerTipo
    .map((r) => ({ tipo: r.refId ?? "—", total: Number(r._sum.cantidad ?? 0) }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);
  const fabAyerTotal = fabAyer.reduce((s, p) => s + p.total, 0);

  // Pendiente por RECIBIR en bodega (lo que fabricó Producción y aún no entra a bodega).
  // Si algo queda colgado aquí, puede ser que se vendió directo de producción y no llegó a bodega.
  const prodUbId = await safe(() => ubicacionProduccionId(), null as string | null);
  const pendRec = prodUbId
    ? await safe(async () => {
        const [a, b] = await Promise.all([
          prisma.stockSabor.aggregate({ _sum: { cantidad: true }, _count: true, where: { ubicacionId: prodUbId, cantidad: { gt: 0 } } }),
          prisma.stock.aggregate({ _sum: { cantidad: true }, _count: true, where: { ubicacionId: prodUbId, cantidad: { gt: 0 } } }),
        ]);
        return { items: Number(a._count ?? 0) + Number(b._count ?? 0), u: Number(a._sum.cantidad ?? 0) + Number(b._sum.cantidad ?? 0) };
      }, { items: 0, u: 0 })
    : { items: 0, u: 0 };

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

  // Productos terminados bajo su mínimo de alerta.
  const prodsMin = await safe(
    () => prisma.producto.findMany({
      where: { activo: true, stockMinimo: { gt: 0 } },
      select: { nombre: true, stockMinimo: true, stock: { select: { cantidad: true } } },
    }),
    [] as { nombre: string; stockMinimo: number; stock: { cantidad: number }[] }[],
  );
  const prodBajo = prodsMin
    .map((p) => ({ nombre: p.nombre, total: p.stock.reduce((s, x) => s + x.cantidad, 0), min: p.stockMinimo }))
    .filter((p) => p.total <= p.min);

  // Stock del día (productos terminados con existencia) → el socio manda el stock cada día.
  const stockProductos = await safe(
    () => prisma.producto.findMany({
      where: { activo: true },
      select: { nombre: true, stock: { select: { cantidad: true } } },
    }),
    [] as { nombre: string; stock: { cantidad: number }[] }[],
  );
  const stockHoy = stockProductos
    .map((p) => ({ nombre: p.nombre, total: p.stock.reduce((s, x) => s + x.cantidad, 0) }))
    .filter((p) => p.total > 0)
    .sort((a, b) => b.total - a.total);

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

  // Recordatorios personales ("recuérdame…") para hoy o vencidos, sin cerrar.
  const finHoy = new Date(inicio.getTime() + 24 * 3600 * 1000);
  const recordatorios = await safe(
    () => prisma.nota.findMany({
      where: { estado: { not: "hecha" }, tipo: { in: ["recordatorio", "tarea"] }, fechaObjetivo: { not: null, lt: finHoy } },
      orderBy: { fechaObjetivo: "asc" }, take: 8, select: { texto: true, fechaObjetivo: true },
    }),
    [] as { texto: string; fechaObjetivo: Date | null }[],
  );
  // Cosas anotadas que mueven stock y no se confirmaron ("llegó leche"…).
  const porConfirmar = await safe(() => prisma.nota.count({ where: { accionEstado: "sugerida" } }), 0);

  // Accesos de AYER: quién entró a qué ventana (Socio, Higiene, etc.) → al reporte.
  const accesosAyer = await safe(
    () => prisma.auditoria.findMany({
      where: { accion: "entrar", entidad: "acceso", createdAt: { gte: inicioAyer, lt: inicio } },
      orderBy: { createdAt: "asc" }, select: { detalle: true },
    }),
    [] as { detalle: string | null }[],
  );
  // Agrupa por persona → set de secciones visitadas.
  const accesosPorPersona = new Map<string, Set<string>>();
  for (const a of accesosAyer) {
    try {
      const d = JSON.parse(a.detalle ?? "{}");
      const quien = d.nombre || "—";
      const sec = d.seccion || "—";
      (accesosPorPersona.get(quien) ?? accesosPorPersona.set(quien, new Set()).get(quien)!).add(sec);
    } catch { /* detalle no-JSON: ignora */ }
  }

  // Notas y tareas del equipo de hoy (bitácora/observaciones/ideas) → van al reporte.
  const notasEquipo = await safe(
    () => prisma.nota.findMany({
      where: { estado: { not: "hecha" }, tipo: { not: "recordatorio" }, accionEstado: { not: "sugerida" }, createdAt: { gte: inicio } },
      orderBy: [{ prioridad: "asc" }, { createdAt: "desc" }], take: 8,
      select: { texto: true, tipo: true, area: true, autor: true },
    }),
    [] as { texto: string; tipo: string; area: string; autor: string | null }[],
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
  if (fabAyer.length) {
    L.push("");
    L.push(`🏭 *Fabricado ayer por tipo (${fabAyerTotal} u.):*`);
    L.push(fabAyer.map((p) => `   • ${lineaLabel[p.tipo] ?? p.tipo}: ${p.total}`).join("\n"));
  }
  L.push(`👥 *Equipo hoy:* ${Number(asistHoy._count ?? 0)} presentes · ${Number(asistHoy._sum.horas ?? 0)} h`);
  L.push("");
  L.push(`📦 *Pendientes:*`);
  L.push(`   • Pedidos por entregar: ${pedidosPend}`);
  L.push(`   • Preventa sin respuesta: ${preventaAbierta}`);
  L.push(`   • Por cobrar: ${fmtCLP(Number(porCobrar._sum.total ?? 0))} (${Number(porCobrar._count ?? 0)})`);
  L.push(`   • Caja: ${cajaAbierta > 0 ? "⚠️ abierta sin cerrar" : "✅ cerrada"}`);
  if (pendRec.items > 0) {
    L.push(`   • 📥 Por recibir de producción: ${pendRec.u} u. (${pendRec.items} ítem${pendRec.items === 1 ? "" : "s"}) — revisa que no se haya vendido directo sin pasar por bodega.`);
  }
  if (bajoStock.length) {
    L.push("");
    L.push(`🛒 *Comprar — insumos bajos (${bajoStock.length}):*`);
    L.push(bajoStock.slice(0, 12).map((m) => `   • ${m.nombre}: quedan ${m.stock} ${m.unidad} (mín ${m.stockMinimo})`).join("\n"));
    if (bajoStock.length > 12) L.push(`   • …y ${bajoStock.length - 12} más.`);
  }
  if (prodBajo.length) {
    L.push("");
    L.push(`🔴 *Productos bajo mínimo (${prodBajo.length}):*`);
    L.push(prodBajo.slice(0, 8).map((p) => `   • ${p.nombre}: ${p.total} (mín ${p.min})`).join("\n"));
  }
  if (stockHoy.length) {
    const totalU = stockHoy.reduce((s, p) => s + p.total, 0);
    L.push("");
    L.push(`📦 *Stock del día (${stockHoy.length} productos · ${totalU} u.):*`);
    L.push(stockHoy.slice(0, 20).map((p) => `   • ${p.nombre}: ${p.total}`).join("\n"));
    if (stockHoy.length > 20) L.push(`   • …y ${stockHoy.length - 20} más (ve el detalle en benechito.com/admin).`);
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
  if (recordatorios.length) {
    L.push("");
    L.push(`🔔 *Recordatorios de hoy (${recordatorios.length}):*`);
    L.push(recordatorios.map((r) => {
      const f = r.fechaObjetivo ? new Date(r.fechaObjetivo) : null;
      const venc = f && f < inicio;
      const fs = f ? f.toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : "";
      const hs = f && (f.getHours() || f.getMinutes()) ? f.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : "";
      return `   • ${r.texto}${hs ? ` — ${hs}` : ""}${venc ? ` (⚠️ venció ${fs})` : ""}`;
    }).join("\n"));
  }
  if (porConfirmar > 0) {
    L.push("");
    L.push(`⚡ *Por confirmar (${porConfirmar}):* cosas anotadas sin actualizar (ej. “llegó…”). Revísalas en Pendientes del cerebro.`);
  }
  if (notasEquipo.length) {
    const ic: Record<string, string> = { tarea: "✅", observacion: "👁️", idea: "💡" };
    L.push("");
    L.push(`📝 *Notas del equipo hoy (${notasEquipo.length}):*`);
    L.push(notasEquipo.map((n) => `   • ${ic[n.tipo] ?? "•"} ${n.texto}${n.autor ? ` — ${n.autor}` : ""}`).join("\n"));
  }
  if (accesosPorPersona.size > 0) {
    L.push("");
    L.push(`🕑 *Accesos de ayer (${accesosPorPersona.size}):*`);
    L.push([...accesosPorPersona.entries()].slice(0, 10).map(
      ([quien, secs]) => `   • ${quien}: ${[...secs].join(", ")}`,
    ).join("\n"));
  }
  L.push("");
  L.push(`🐝 Tu socio Panal · benechito.com/admin`);

  const texto = L.join("\n");
  return NextResponse.json({ ok: true, fecha, texto });
}
