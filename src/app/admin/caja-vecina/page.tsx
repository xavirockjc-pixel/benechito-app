import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { rangoPeriodo } from "@/lib/dominio/sueldos";
import { signoCV, cvLabel, cvIcono } from "@/lib/dominio/caja-vecina";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function AdminCajaVecina({ searchParams }: { searchParams: Promise<{ periodo?: string; off?: string }> }) {
  const sp = await searchParams;
  const periodo = sp.periodo === "mes" ? "mes" : "semana";
  const off = Number.isFinite(Number(sp.off)) ? parseInt(sp.off ?? "0", 10) : 0;
  const { inicio, fin, label, esSemana } = rangoPeriodo(periodo, off);

  const movs = await prisma.movimientoCajaVecina.findMany({ where: { fecha: { gte: inicio, lt: fin } }, orderBy: { fecha: "desc" } });

  const neto = movs.reduce((s, m) => s + signoCV(m.tipo) * num(m.monto), 0);
  const giros = movs.filter((m) => m.tipo === "giro").reduce((s, m) => s + num(m.monto), 0);
  const depositos = movs.filter((m) => m.tipo === "deposito" || m.tipo === "pago").reduce((s, m) => s + num(m.monto), 0);
  const comision = movs.filter((m) => m.tipo === "comision").reduce((s, m) => s + num(m.monto), 0);

  const qs = (patch: { periodo?: string; off?: number }) => `/admin/caja-vecina?periodo=${patch.periodo ?? periodo}&off=${patch.off ?? off}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">🏧 Caja Vecina — registros</h1>
        <p className="text-sm text-slate-500">Movimientos del servicio, <b>aparte de las ventas del negocio</b>. Solo para control y análisis.</p>
      </div>

      {/* Período */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <Link href={qs({ periodo: "semana", off: 0 })} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${esSemana ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-600"}`}>Semana</Link>
        <Link href={qs({ periodo: "mes", off: 0 })} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${!esSemana ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-600"}`}>Mes</Link>
      </div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <Link href={qs({ off: off - 1 })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">←</Link>
        <span className="min-w-[11rem] text-center text-sm font-extrabold capitalize text-slate-800">{label}</span>
        <Link href={qs({ off: off + 1 })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">→</Link>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Neto efectivo" valor={CLP(neto)} color={neto >= 0 ? "#0f7a44" : "#e23b2c"} />
        <Kpi label="Giros" valor={CLP(giros)} color="#e23b2c" />
        <Kpi label="Depósitos/pagos" valor={CLP(depositos)} color="#1479c4" />
        <Kpi label="Comisión ganada" valor={CLP(comision)} color="#f28a1e" />
      </div>

      {/* Lista */}
      <div className="mt-5">
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">Movimientos ({movs.length})</h2>
        {movs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">Sin movimientos en el período.</p>
        ) : (
          <ul className="space-y-2">
            {movs.map((m) => {
              const entra = signoCV(m.tipo) > 0;
              return (
                <li key={m.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  {m.foto ? <img src={m.foto} alt="comprobante" className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover" /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-slate-50 text-lg">{cvIcono[m.tipo]}</span>}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{cvLabel[m.tipo]}</p>
                    <p className="truncate text-[11px] text-slate-400">{fmtDia(m.fecha)}{m.detalle ? ` · ${m.detalle}` : ""}{m.nombreUsuario ? ` · ${m.nombreUsuario}` : ""}</p>
                  </div>
                  <span className={`shrink-0 text-sm font-extrabold tabular-nums ${entra ? "text-emerald-600" : "text-rose-600"}`}>{entra ? "+" : "−"}{CLP(num(m.monto))}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="truncate text-base font-extrabold text-slate-900 tabular-nums" title={valor}>{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
