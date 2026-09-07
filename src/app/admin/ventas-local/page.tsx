import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const canalLabel: Record<string, string> = { local: "🧾 Local (sala)", directa: "🛒 Directa", terreno: "🚚 Terreno", ruta: "🚚 Ruta", online: "🌐 Online", negocio: "🏪 Mayorista" };
const MAYOR = new Set(["mayorista", "distribuidor", "revendedor", "negocio_retiro"]);
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export default async function VentasLocalPage() {
  const ahora = new Date();
  const desde12 = new Date(ahora.getFullYear(), ahora.getMonth() - 11, 1);
  const desde90 = new Date(ahora.getTime() - 90 * 864e5);

  const [ventas, movs] = await Promise.all([
    prisma.venta.findMany({ where: { fecha: { gte: desde12 } }, select: { total: true, fecha: true, canal: true, negocio: { select: { tipoCliente: true } } } }),
    prisma.movimientoStock.findMany({ where: { tipo: "venta", fecha: { gte: desde90 } }, select: { cantidad: true, producto: { select: { categoria: true, linea: true } } } }),
  ]);

  const total12 = ventas.reduce((s, v) => s + num(v.total), 0);
  const ticket = ventas.length ? total12 / ventas.length : 0;

  // Por canal
  const porCanal = new Map<string, number>();
  for (const v of ventas) porCanal.set(v.canal, (porCanal.get(v.canal) ?? 0) + num(v.total));
  const canales = [...porCanal.entries()].sort((a, b) => b[1] - a[1]);

  // Mayor vs detalle
  let mayor = 0, detalle = 0;
  for (const v of ventas) (MAYOR.has(v.negocio?.tipoCliente ?? "") ? (mayor += num(v.total)) : (detalle += num(v.total)));

  // Por día de la semana
  const porDia = new Array(7).fill(0);
  for (const v of ventas) { const d = (new Date(v.fecha).getDay() + 6) % 7; porDia[d] += num(v.total); }
  const maxDia = Math.max(1, ...porDia);

  // Por mes (12)
  const meses: { label: string; total: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
    const t = ventas.filter((v) => { const f = new Date(v.fecha); return f.getFullYear() === d.getFullYear() && f.getMonth() === d.getMonth(); }).reduce((s, v) => s + num(v.total), 0);
    meses.push({ label: d.toLocaleDateString("es-CL", { month: "short" }), total: t });
  }
  const maxMes = Math.max(1, ...meses.map((m) => m.total));
  const mejorMes = [...meses].sort((a, b) => b.total - a.total)[0];
  const mejorDia = porDia.indexOf(Math.max(...porDia));

  // Por tipo de producto (unidades, últimos 90 días)
  const porTipo = new Map<string, number>();
  for (const m of movs) { const k = m.producto?.categoria || m.producto?.linea || "otros"; porTipo.set(k, (porTipo.get(k) ?? 0) + num(m.cantidad)); }
  const tipos = [...porTipo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxTipo = Math.max(1, ...tipos.map((t) => t[1]));
  const maxCanal = Math.max(1, ...canales.map((c) => c[1]));

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">🏪 Ventas Local</h1>
        <p className="text-sm text-slate-500">Análisis: qué días y meses se vende más, por canal, mayor/detalle y tipo de producto (últimos 12 meses).</p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Ventas 12 meses" valor={CLP(total12)} color="#2f9e44" />
        <Kpi label="N° de ventas" valor={String(ventas.length)} color="#1479c4" />
        <Kpi label="Ticket promedio" valor={CLP(ticket)} color="#7c3aed" />
        <Kpi label="Mejor mes" valor={mejorMes ? mejorMes.label : "—"} sub={mejorMes ? CLP(mejorMes.total) : ""} color="#f28a1e" />
      </div>

      {/* Por mes */}
      <Seccion titulo="📅 Ventas por mes">
        <div className="flex items-end gap-1.5" style={{ height: 140 }}>
          {meses.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div className="w-full rounded-t bg-emerald-400" style={{ height: `${(m.total / maxMes) * 110}px` }} title={CLP(m.total)} />
              <span className="text-[9px] font-bold text-slate-400">{m.label}</span>
            </div>
          ))}
        </div>
      </Seccion>

      {/* Por día de semana */}
      <Seccion titulo={`🗓️ Por día de la semana — el mejor es ${DIAS[mejorDia]}`}>
        <ul className="space-y-1.5">
          {DIAS.map((d, i) => (
            <li key={d} className="flex items-center gap-2">
              <span className={`w-10 text-xs font-bold ${i === mejorDia ? "text-emerald-600" : "text-slate-500"}`}>{d}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(porDia[i] / maxDia) * 100}%`, background: i === mejorDia ? "#2f9e44" : "#93c5fd" }} /></div>
              <span className="w-24 text-right text-xs font-bold tabular-nums text-slate-600">{CLP(porDia[i])}</span>
            </li>
          ))}
        </ul>
      </Seccion>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Por canal */}
        <Seccion titulo="🧭 Por canal">
          <ul className="space-y-1.5">
            {canales.map(([c, t]) => (
              <li key={c} className="flex items-center gap-2">
                <span className="w-28 truncate text-xs font-bold text-slate-600">{canalLabel[c] ?? c}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-sky-400" style={{ width: `${(t / maxCanal) * 100}%` }} /></div>
                <span className="w-24 text-right text-xs font-bold tabular-nums text-slate-600">{CLP(t)}</span>
              </li>
            ))}
          </ul>
        </Seccion>

        {/* Mayor vs detalle */}
        <Seccion titulo="⚖️ Al por mayor vs detalle">
          <div className="space-y-2">
            <Barra label="🏪 Al por mayor" valor={mayor} max={Math.max(1, mayor, detalle)} color="#7c3aed" />
            <Barra label="🛍️ Al detalle" valor={detalle} max={Math.max(1, mayor, detalle)} color="#f28a1e" />
          </div>
        </Seccion>
      </div>

      {/* Por tipo de producto */}
      <Seccion titulo="🍫 Qué se mueve más — por tipo de producto (90 días, unidades)">
        {tipos.length === 0 ? <p className="text-sm text-slate-400">Aún sin datos de productos vendidos.</p> : (
          <ul className="space-y-1.5">
            {tipos.map(([t, u]) => (
              <li key={t} className="flex items-center gap-2">
                <span className="w-28 truncate text-xs font-bold text-slate-600">{t}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400" style={{ width: `${(u / maxTipo) * 100}%` }} /></div>
                <span className="w-16 text-right text-xs font-bold tabular-nums text-slate-600">{u} u.</span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <p className="mt-6 text-center text-[11px] text-slate-400">📊 Se recalcula solo con cada venta. Para separar dulce/helado o por sucursal, lo afinamos cuando quieras.</p>
    </div>
  );
}

function Kpi({ label, valor, sub, color }: { label: string; valor: string; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="truncate text-base font-extrabold text-slate-900 tabular-nums" title={valor}>{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      {sub && <p className="text-[10px] font-bold" style={{ color }}>{sub}</p>}
    </div>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-500">{titulo}</h2>
      {children}
    </div>
  );
}

function Barra({ label, valor, max, color }: { label: string; valor: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-28 text-xs font-bold text-slate-600">{label}</span>
      <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${(valor / max) * 100}%`, background: color }} /></div>
      <span className="w-24 text-right text-xs font-bold tabular-nums text-slate-600">{CLP(valor)}</span>
    </div>
  );
}
