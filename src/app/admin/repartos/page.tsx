import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { getCanales } from "@/lib/dominio/canales";
import { registrarCostoReparto, eliminarCostoReparto } from "./actions";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function RepartosCostoPage() {
  const inicioMes = new Date();
  inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);

  const [costos, canales] = await Promise.all([
    prisma.costoReparto.findMany({ orderBy: { fecha: "desc" }, take: 100 }),
    getCanales(true),
  ]);
  const canalLabel: Record<string, string> = {};
  for (const c of canales) canalLabel[c.codigo] = c.nombre;

  const delMes = costos.filter((c) => c.fecha >= inicioMes);
  const combMes = delMes.reduce((s, c) => s + Number(c.combustible), 0);
  const horasMes = delMes.reduce((s, c) => s + c.horas, 0);
  const kmMes = delMes.reduce((s, c) => s + c.km, 0);

  // Costo de combustible por canal (mes).
  const porCanal = new Map<string, number>();
  for (const c of delMes) {
    const k = c.canal ?? "—";
    porCanal.set(k, (porCanal.get(k) ?? 0) + Number(c.combustible));
  }
  const maxCanal = Math.max(1, ...[...porCanal.values()]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🚚 Costos de reparto</h1>
      <p className="text-sm text-slate-500">Combustible y tiempo de los despachos (rutas, distribuidores…), para ver cuánto cuesta repartir.</p>

      {/* KPIs del mes */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Kpi label="Combustible (mes)" valor={fmtCLP(combMes)} />
        <Kpi label="Horas (mes)" valor={`${horasMes.toFixed(1).replace(/\.0$/, "")} h`} />
        <Kpi label="Km (mes)" valor={`${kmMes.toFixed(0)} km`} />
      </div>

      {/* Combustible por canal */}
      {porCanal.size > 0 && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Combustible por canal (mes)</p>
          <div className="space-y-1.5">
            {[...porCanal.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <span className="w-28 truncate text-xs font-semibold text-slate-600">{canalLabel[k] ?? k}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#d97706]" style={{ width: `${(v / maxCanal) * 100}%` }} />
                </div>
                <span className="w-20 text-right text-xs font-bold text-[#b45309]">{fmtCLP(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registrar */}
      <form action={registrarCostoReparto} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-bold text-slate-700">Registrar un reparto</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">Combustible $
            <input name="combustible" inputMode="numeric" placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">Horas
            <input name="horas" inputMode="decimal" placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">Km
            <input name="km" inputMode="decimal" placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">Canal
            <select name="canal" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="">—</option>
              {canales.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
            </select>
          </label>
          <label className="col-span-2 text-xs font-bold text-slate-600 sm:col-span-4">Notas
            <input name="notas" placeholder="Ej: reparto a distribuidor centro" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
        </div>
        <button className="mt-2 w-full rounded-lg bg-[#d97706] py-2.5 text-sm font-extrabold text-white active:scale-95">➕ Registrar reparto</button>
      </form>

      {/* Historial */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">Historial</h2>
      {costos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aún no registras repartos.</p>
      ) : (
        <div className="space-y-1">
          {costos.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
              <span className="min-w-0 truncate">
                <b className="text-[#b45309]">{fmtCLP(Number(c.combustible))}</b>
                {c.horas > 0 ? <span className="text-slate-500"> · {c.horas}h</span> : ""}
                {c.km > 0 ? <span className="text-slate-500"> · {c.km}km</span> : ""}
                {c.canal ? <span className="text-slate-400"> · {canalLabel[c.canal] ?? c.canal}</span> : ""}
                {c.notas ? <span className="text-xs text-slate-400"> · {c.notas}</span> : ""}
                <span className="block text-[11px] text-slate-400">{fmtFecha(c.fecha)}{c.nombreUsuario ? ` · ${c.nombreUsuario}` : ""}</span>
              </span>
              <form action={eliminarCostoReparto}><input type="hidden" name="id" value={c.id} /><button className="ml-2 shrink-0 text-xs font-semibold text-red-400">quitar</button></form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-lg font-extrabold text-slate-900">{valor}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
