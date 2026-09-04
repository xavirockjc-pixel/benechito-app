import Link from "next/link";
import { prisma } from "@/lib/prisma";
import EnviarWhatsApp from "@/components/EnviarWhatsApp";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);

export default async function SocioPage() {
  const ahora = new Date();
  const hoy0 = new Date(ahora); hoy0.setHours(0, 0, 0, 0);
  const hace7 = new Date(ahora.getTime() - 7 * 864e5);

  const [
    ventasHoy, ventasSemana, pedidosPend, nuevosHoy,
    cobrosVencidos, cobrosPorCobrar, notasAlta, accionesSug,
    productosMin, stockAgg, cajaAbierta,
  ] = await Promise.all([
    prisma.venta.aggregate({ _sum: { total: true }, _count: true, where: { fecha: { gte: hoy0 } } }),
    prisma.venta.aggregate({ _sum: { total: true }, where: { fecha: { gte: hace7 } } }),
    prisma.pedido.count({ where: { estado: { notIn: ["entregado", "finalizado"] } } }),
    prisma.negocio.count({ where: { createdAt: { gte: hoy0 } } }),
    prisma.venta.count({ where: { estadoPago: "vencido" } }),
    prisma.venta.count({ where: { estadoPago: { in: ["pendiente", "parcial", "vencido"] } } }),
    prisma.nota.count({ where: { estado: "abierta", prioridad: "alta" } }),
    prisma.nota.count({ where: { accionEstado: "sugerida" } }),
    prisma.producto.findMany({ where: { activo: true, stockMinimo: { gt: 0 } }, select: { id: true, stockMinimo: true } }),
    prisma.stock.groupBy({ by: ["productoId"], _sum: { cantidad: true } }),
    prisma.sesionCaja.findFirst({ where: { estado: "abierta" }, select: { id: true } }),
  ]);

  const stockMap = new Map(stockAgg.map((s) => [s.productoId, num(s._sum.cantidad)]));
  const stockBajo = productosMin.filter((p) => (stockMap.get(p.id) ?? 0) < p.stockMinimo).length;

  const vHoy = num(ventasHoy._sum.total);
  const nHoy = ventasHoy._count;
  const vSem = num(ventasSemana._sum.total);

  // Alertas + prioridades (subconjunto del Supercerebro)
  const alertas = [
    { icon: "📦", txt: `Stock bajo mínimo: ${stockBajo} producto(s)`, valor: stockBajo, sev: 3, href: "/admin/inventario" },
    { icon: "💸", txt: `Cobros vencidos: ${cobrosVencidos} (por cobrar: ${cobrosPorCobrar})`, valor: cobrosVencidos, sev: 3, href: "/admin/finanzas" },
    { icon: "🔴", txt: `Notas urgentes sin resolver: ${notasAlta}`, valor: notasAlta, sev: 3, href: "/admin/notas" },
    { icon: "⚡", txt: `Acciones por confirmar: ${accionesSug}`, valor: accionesSug, sev: 2, href: "/admin/notas" },
    { icon: "🧾", txt: `Pedidos pendientes: ${pedidosPend}`, valor: pedidosPend, sev: 2, href: "/admin/pedidos" },
  ].filter((a) => a.valor > 0);
  const prioridades = [...alertas].sort((a, b) => b.sev - a.sev || b.valor - a.valor).slice(0, 3);

  const fechaTxt = ahora.toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });

  // Texto del resumen para WhatsApp
  const resumen =
    `🐝 Benechito — Resumen ${fechaTxt}\n\n` +
    `💵 Ventas hoy: ${CLP(vHoy)} (${nHoy})\n` +
    `📅 Ventas semana: ${CLP(vSem)}\n` +
    `🧾 Pedidos pendientes: ${pedidosPend}\n` +
    `✨ Clientes nuevos hoy: ${nuevosHoy}\n` +
    `🧾 Caja: ${cajaAbierta ? "abierta" : "cerrada"}\n\n` +
    (alertas.length
      ? `⚠️ Alertas\n` + alertas.map((a) => `• ${a.icon} ${a.txt}`).join("\n") + `\n\n`
      : `✅ Sin alertas.\n\n`) +
    (prioridades.length
      ? `🎯 Prioridades\n` + prioridades.map((p, i) => `${i + 1}. ${p.icon} ${p.txt}`).join("\n")
      : `🎉 Todo bajo control.`);

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">🐝 Socio administrativo</h1>
        <p className="text-sm text-slate-500 first-letter:uppercase">{fechaTxt} · tu segundo cerebro te arma el reporte para enviarlo por WhatsApp.</p>
      </div>

      {/* KPIs del día */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Ventas hoy" valor={CLP(vHoy)} sub={`${nHoy} venta(s)`} color="#2f9e44" />
        <Kpi label="Ventas semana" valor={CLP(vSem)} color="#1479c4" />
        <Kpi label="Pedidos pend." valor={String(pedidosPend)} color="#f28a1e" />
        <Kpi label="Clientes nuevos" valor={String(nuevosHoy)} sub="hoy" color="#7c3aed" />
      </div>

      {/* Alertas + prioridades en pantalla */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-rose-600">⚠️ Alertas</h2>
          {alertas.length === 0 ? (
            <p className="text-sm font-semibold text-emerald-600">✅ Sin alertas hoy.</p>
          ) : (
            <ul className="space-y-1.5">
              {alertas.map((a, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                  <span>{a.icon}</span><span className="flex-1">{a.txt}</span>
                  <Link href={a.href} className="text-[11px] font-bold text-amber-600 hover:underline">ver →</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">🎯 Prioridades</h2>
          {prioridades.length === 0 ? (
            <p className="text-sm font-semibold text-emerald-600">🎉 Todo bajo control.</p>
          ) : (
            <ol className="space-y-1.5">
              {prioridades.map((p, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{i + 1}</span>
                  <span>{p.icon}</span><span className="flex-1">{p.txt}</span>
                </li>
              ))}
            </ol>
          )}
          <Link href="/admin/supercerebro" className="mt-3 inline-block text-xs font-bold text-amber-600 hover:underline">Ver Supercerebro completo →</Link>
        </div>
      </div>

      {/* Enviar por WhatsApp */}
      <div className="mt-5">
        <EnviarWhatsApp texto={resumen} />
      </div>

      <p className="mt-4 text-center text-[11px] text-slate-400">🐝 Más adelante esto se puede programar para que llegue solo cada mañana. Por ahora lo revisas y lo envías con un toque.</p>
    </div>
  );
}

function Kpi({ label, valor, sub, color }: { label: string; valor: string; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="text-lg font-extrabold text-slate-900">{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
    </div>
  );
}
