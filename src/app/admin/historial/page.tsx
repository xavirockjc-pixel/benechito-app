import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { getCanalMaps } from "@/lib/dominio/canales";

export const dynamic = "force-dynamic";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const COLORES = ["#d8a944", "#2f9e44", "#1479c4", "#f28a1e", "#e23b2c"];
const fd = (d: Date) => d.toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

type Tipo = "dia" | "semana" | "mes";
function rango(tipo: Tipo, off: number): { desde: Date; hasta: Date; label: string } {
  const n = new Date(); n.setHours(0, 0, 0, 0);
  if (tipo === "dia") {
    const d = new Date(n); d.setDate(n.getDate() + off);
    const h = new Date(d); h.setDate(d.getDate() + 1);
    return { desde: d, hasta: h, label: off === 0 ? "Hoy" : off === -1 ? "Ayer" : d.toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" }) };
  }
  if (tipo === "semana") {
    const lun = new Date(n); lun.setDate(n.getDate() - ((n.getDay() + 6) % 7) + off * 7);
    const h = new Date(lun); h.setDate(lun.getDate() + 7);
    return { desde: lun, hasta: h, label: `Semana ${fd(lun)} – ${fd(new Date(h.getTime() - 1))}` };
  }
  const m = new Date(n.getFullYear(), n.getMonth() + off, 1);
  const h = new Date(n.getFullYear(), n.getMonth() + off + 1, 1);
  return { desde: m, hasta: h, label: `${MESES[m.getMonth()]} ${m.getFullYear()}` };
}

/**
 * Historial / analítica navegable: elige día, semana o mes y navega hacia atrás/
 * adelante para ver las ventas (total y por canal) y la producción de ese período.
 */
export default async function HistorialPage({ searchParams }: { searchParams: Promise<{ tipo?: string; off?: string }> }) {
  const sp = await searchParams;
  const tipo: Tipo = sp.tipo === "dia" ? "dia" : sp.tipo === "semana" ? "semana" : "mes";
  const off = Math.min(0, Math.trunc(Number(sp.off) || 0)); // 0 = actual, negativo = atrás
  const { desde, hasta, label } = rango(tipo, off);

  const [ventasAgg, canalAgg, prodAgg, pagosAgg] = await Promise.all([
    prisma.venta.aggregate({ _sum: { total: true }, _count: true, where: { fecha: { gte: desde, lt: hasta } } }),
    prisma.venta.groupBy({ by: ["canal"], _sum: { total: true }, where: { fecha: { gte: desde, lt: hasta } } }),
    prisma.movimientoBodega.aggregate({ _sum: { cantidad: true }, where: { zona: "produccion", fecha: { gte: desde, lt: hasta } } }),
    prisma.pago.aggregate({ _sum: { monto: true }, where: { fecha: { gte: desde, lt: hasta } } }),
  ]);
  const { label: canalLabel } = await getCanalMaps();

  const total = Number(ventasAgg._sum.total ?? 0);
  const nVentas = ventasAgg._count;
  const producido = Number(prodAgg._sum.cantidad ?? 0);
  const cobrado = Number(pagosAgg._sum.monto ?? 0);
  const canales = canalAgg.filter((c) => Number(c._sum.total ?? 0) > 0).sort((a, b) => Number(b._sum.total ?? 0) - Number(a._sum.total ?? 0));

  const qs = (patch: { tipo?: Tipo; off?: number }) => `/admin/historial?tipo=${patch.tipo ?? tipo}&off=${patch.off ?? off}`;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin" className="text-sm font-semibold text-[#1479c4]">← Panel</Link>
      <h1 className="mt-1 text-2xl font-extrabold text-slate-900">📊 Historial</h1>
      <p className="text-sm text-slate-500">Ventas y producción por día, semana o mes. Navega hacia atrás.</p>

      {/* Tipo de período */}
      <div className="mt-3 inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {([["dia", "Día"], ["semana", "Semana"], ["mes", "Mes"]] as const).map(([k, lbl]) => (
          <Link key={k} href={qs({ tipo: k, off: 0 })} className={`rounded-lg px-4 py-1.5 text-sm font-bold ${tipo === k ? "bg-slate-900 text-white" : "text-slate-500"}`}>{lbl}</Link>
        ))}
      </div>

      {/* Navegación del período */}
      <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <Link href={qs({ off: off - 1 })} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">‹ Anterior</Link>
        <span className="text-center text-sm font-extrabold capitalize text-slate-900">{label}</span>
        {off < 0 ? <Link href={qs({ off: off + 1 })} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">Siguiente ›</Link> : <span className="w-20" />}
      </div>

      {/* KPIs del período */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Ventas" valor={fmtCLP(total)} color="#1479c4" />
        <Kpi label="N° de ventas" valor={String(nVentas)} color="#2f9e44" />
        <Kpi label="Cobrado" valor={fmtCLP(cobrado)} color="#f28a1e" />
        <Kpi label="Producido (u.)" valor={String(producido)} color="#e0730c" />
      </div>

      {/* Ventas por canal */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">Ventas por canal</h2>
      {canales.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">Sin ventas en este período.</p>
      ) : (
        <div className="space-y-1.5">
          {canales.map((c, i) => {
            const v = Number(c._sum.total ?? 0);
            return (
              <div key={c.canal} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <span className="h-3 w-3 rounded-full" style={{ background: COLORES[i % COLORES.length] }} />
                  {canalLabel[c.canal] ?? c.canal}
                </span>
                <span className="font-extrabold text-slate-900">{fmtCLP(v)} <span className="text-xs font-semibold text-slate-400">({total > 0 ? Math.round((v / total) * 100) : 0}%)</span></span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-lg font-extrabold" style={{ color }}>{valor}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
