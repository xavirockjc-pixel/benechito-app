import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const pct = (a: number, b: number) => (b === 0 ? (a > 0 ? 100 : 0) : Math.round(((a - b) / Math.abs(b)) * 100));

export default async function PanoramaPage() {
  const ahora = new Date();
  const inicio6 = new Date(ahora.getFullYear(), ahora.getMonth() - 5, 1);

  const [ventas, gastos, pagosTrab, fletes, cvComision, porCobrarAgg] = await Promise.all([
    prisma.venta.findMany({ where: { fecha: { gte: inicio6 } }, select: { total: true, fecha: true, canal: true } }),
    prisma.gasto.findMany({ where: { fecha: { gte: inicio6 }, personal: false }, select: { monto: true, fecha: true, categoria: true } }),
    prisma.movimientoTrabajador.findMany({ where: { tipo: "pago", fecha: { gte: inicio6 } }, select: { monto: true, fecha: true } }),
    prisma.flete.findMany({ where: { fecha: { gte: inicio6 } }, select: { monto: true, fecha: true } }),
    prisma.movimientoCajaVecina.findMany({ where: { tipo: "comision", fecha: { gte: inicio6 } }, select: { monto: true, fecha: true } }),
    prisma.venta.aggregate({ _sum: { total: true }, where: { estadoPago: { in: ["pendiente", "parcial", "vencido"] } } }),
  ]);

  // Buckets por mes (0 = hace 5 meses ... 5 = mes actual)
  const idx = (f: Date) => (new Date(f).getFullYear() - inicio6.getFullYear()) * 12 + (new Date(f).getMonth() - inicio6.getMonth());
  const B = () => [0, 0, 0, 0, 0, 0];
  const bVentas = B(), bFletes = B(), bComision = B(), bGastos = B(), bSueldos = B();
  for (const v of ventas) { const i = idx(v.fecha); if (i >= 0 && i < 6) bVentas[i] += num(v.total); }
  for (const f of fletes) { const i = idx(f.fecha); if (i >= 0 && i < 6) bFletes[i] += num(f.monto); }
  for (const c of cvComision) { const i = idx(c.fecha); if (i >= 0 && i < 6) bComision[i] += num(c.monto); }
  for (const g of gastos) { const i = idx(g.fecha); if (i >= 0 && i < 6 && g.categoria !== "sueldos") bGastos[i] += num(g.monto); }
  for (const p of pagosTrab) { const i = idx(p.fecha); if (i >= 0 && i < 6) bSueldos[i] += num(p.monto); }

  const ingresosMes = bVentas.map((v, i) => v + bFletes[i] + bComision[i]);
  const egresosMes = bGastos.map((g, i) => g + bSueldos[i]);
  const utilidadMes = ingresosMes.map((v, i) => v - egresosMes[i]);

  const labels = B().map((_, i) => new Date(inicio6.getFullYear(), inicio6.getMonth() + i, 1).toLocaleDateString("es-CL", { month: "short" }));
  const cur = 5, prev = 4;

  // Mes actual
  const ing = ingresosMes[cur], egr = egresosMes[cur], util = utilidadMes[cur];
  const ventasCur = bVentas[cur];
  const porCobrar = num(porCobrarAgg._sum.total); // aprox: total de ventas no pagadas (bruto)

  const dVentas = pct(bVentas[cur], bVentas[prev]);
  const dUtil = pct(utilidadMes[cur], utilidadMes[prev]);
  const maxAbs = Math.max(1, ...ingresosMes, ...egresosMes);

  // Insights automáticos
  const insights: string[] = [];
  insights.push(dVentas >= 0 ? `📈 Las ventas subieron ${dVentas}% vs el mes pasado.` : `📉 Las ventas bajaron ${Math.abs(dVentas)}% vs el mes pasado.`);
  insights.push(util >= 0 ? `🟢 Este mes vas ganando ${CLP(util)}.` : `🔴 Este mes vas perdiendo ${CLP(-util)}.`);
  if (bSueldos[cur] > bGastos[cur]) insights.push(`👥 El mayor egreso son los sueldos (${CLP(bSueldos[cur])}).`);
  else if (bGastos[cur] > 0) insights.push(`🧾 El mayor egreso son los gastos (${CLP(bGastos[cur])}).`);
  if (porCobrar > 0) insights.push(`⏳ Tienes ${CLP(porCobrar)} por cobrar — cobrar mejora tu caja.`);

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">📊 Panorama general</h1>
        <p className="text-sm text-slate-500">La plata de todo el ecosistema: cuánto entra, cuánto sale y cuánto queda — con análisis del mes.</p>
      </div>

      {/* KPIs del mes */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label={`Ingresos (${labels[cur]})`} valor={CLP(ing)} color="#2f9e44" />
        <Kpi label="Egresos" valor={CLP(egr)} color="#e23b2c" />
        <Kpi label="Utilidad estimada" valor={CLP(util)} color={util >= 0 ? "#15803d" : "#b91c1c"} sub={`${dUtil >= 0 ? "▲" : "▼"} ${Math.abs(dUtil)}% vs mes ant.`} />
        <Kpi label="Por cobrar" valor={CLP(porCobrar)} color="#f28a1e" />
      </div>

      {/* Análisis / insights */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">🔎 Análisis del mes</h2>
        <ul className="space-y-1.5 text-sm text-slate-700">
          {insights.map((t, i) => <li key={i}>{t}</li>)}
        </ul>
      </div>

      {/* Tendencia 6 meses: ingresos vs egresos */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-extrabold uppercase tracking-wide text-slate-500">📈 Ingresos vs egresos (6 meses)</h2>
        <div className="flex items-end gap-2" style={{ height: 160 }}>
          {labels.map((l, i) => (
            <div key={i} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div className="flex w-full items-end justify-center gap-0.5" style={{ height: 130 }}>
                <div className="w-1/2 rounded-t bg-emerald-400" style={{ height: `${(ingresosMes[i] / maxAbs) * 125}px` }} title={`Ingresos ${CLP(ingresosMes[i])}`} />
                <div className="w-1/2 rounded-t bg-rose-400" style={{ height: `${(egresosMes[i] / maxAbs) * 125}px` }} title={`Egresos ${CLP(egresosMes[i])}`} />
              </div>
              <span className={`text-[10px] font-bold ${i === cur ? "text-slate-900" : "text-slate-400"}`}>{l}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-center gap-4 text-[11px] font-bold">
          <span className="text-emerald-600">■ Ingresos</span><span className="text-rose-600">■ Egresos</span>
        </div>
      </div>

      {/* Desglose del mes */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-emerald-600">↑ De dónde entra</h2>
          <Linea label="Ventas" valor={bVentas[cur]} tot={ing} />
          <Linea label="Fletes cobrados" valor={bFletes[cur]} tot={ing} />
          <Linea label="Comisión Caja Vecina" valor={bComision[cur]} tot={ing} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-rose-600">↓ En qué se va</h2>
          <Linea label="Sueldos / pagos equipo" valor={bSueldos[cur]} tot={egr} rojo />
          <Linea label="Gastos (insumos, arriendo…)" valor={bGastos[cur]} tot={egr} rojo />
        </div>
      </div>

      <p className="mt-4 text-center text-[11px] text-slate-400">
        📊 Estimación de gestión (no reemplaza la contabilidad). Ventas y por cobrar salen de las ventas; egresos de gastos + pagos al equipo.
        Ver detalle en <Link href="/admin/dashboard" className="font-semibold text-slate-600 underline">Tablero</Link>, <Link href="/admin/ventas-local" className="font-semibold text-slate-600 underline">Ventas Local</Link> y <Link href="/admin/finanzas" className="font-semibold text-slate-600 underline">Finanzas</Link>.
      </p>
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

function Linea({ label, valor, tot, rojo }: { label: string; valor: number; tot: number; rojo?: boolean }) {
  const p = tot > 0 ? Math.round((valor / tot) * 100) : 0;
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold text-slate-800 tabular-nums">{CLP(valor)} <span className="text-[11px] font-normal text-slate-400">{p}%</span></span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full" style={{ width: `${p}%`, background: rojo ? "#fca5a5" : "#86efac" }} /></div>
    </div>
  );
}
