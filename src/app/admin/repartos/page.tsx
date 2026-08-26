import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { getCanales } from "@/lib/dominio/canales";
import { TIPOS_GASTO, tipoGastoLabel, tipoGastoIcono, CHECKLIST_VEHICULO, estadoRevisionLabel, estadoRevisionColor } from "@/lib/dominio/vehiculo";
import { registrarGastoVehiculo, eliminarGastoVehiculo } from "./actions";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function RepartosPage() {
  const inicioMes = new Date();
  inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);

  const [gastos, revisiones, canales] = await Promise.all([
    prisma.gastoVehiculo.findMany({ orderBy: { fecha: "desc" }, take: 120 }),
    prisma.revisionVehiculo.findMany({ orderBy: { fecha: "desc" }, take: 10 }),
    getCanales(true),
  ]);
  const canalLabel: Record<string, string> = {};
  for (const c of canales) canalLabel[c.codigo] = c.nombre;

  const delMes = gastos.filter((g) => g.fecha >= inicioMes);
  const combMes = delMes.filter((g) => g.tipo === "combustible").reduce((s, g) => s + Number(g.monto), 0);
  const otrosMes = delMes.filter((g) => g.tipo !== "combustible").reduce((s, g) => s + Number(g.monto), 0);
  const litrosMes = delMes.reduce((s, g) => s + g.litros, 0);

  // Gasto por tipo (mes).
  const porTipo = new Map<string, number>();
  for (const g of delMes) porTipo.set(g.tipo, (porTipo.get(g.tipo) ?? 0) + Number(g.monto));
  const maxTipo = Math.max(1, ...[...porTipo.values()]);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🚚 Vehículo y reparto</h1>
      <p className="text-sm text-slate-500">Combustible, gastos del vehículo y revisiones del chofer. El repartidor los registra desde su celular.</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Kpi label="Combustible (mes)" valor={fmtCLP(combMes)} />
        <Kpi label="Otros gastos (mes)" valor={fmtCLP(otrosMes)} />
        <Kpi label="Litros (mes)" valor={`${litrosMes.toFixed(0)} L`} />
      </div>

      {/* Gasto por tipo */}
      {porTipo.size > 0 && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Gasto por tipo (mes)</p>
          <div className="space-y-1.5">
            {[...porTipo.entries()].sort((a, b) => b[1] - a[1]).map(([t, v]) => (
              <div key={t} className="flex items-center gap-2">
                <span className="w-28 truncate text-xs font-semibold text-slate-600">{tipoGastoIcono[t]} {tipoGastoLabel[t] ?? t}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#d97706]" style={{ width: `${(v / maxTipo) * 100}%` }} />
                </div>
                <span className="w-20 text-right text-xs font-bold text-[#b45309]">{fmtCLP(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Revisiones recientes */}
      {revisiones.length > 0 && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Últimas revisiones</p>
          <div className="space-y-2">
            {revisiones.map((r) => {
              const rr = r as unknown as Record<string, string>;
              const alertas = CHECKLIST_VEHICULO.filter((it) => rr[it.campo] && rr[it.campo] !== "ok");
              return (
                <div key={r.id} className="rounded-lg bg-slate-50 p-2 text-xs">
                  <p className="font-bold text-slate-600">
                    {fmtFecha(r.fecha)}{r.nombreUsuario ? ` · ${r.nombreUsuario}` : ""}
                    {r.kmSalida > 0 || r.kmEntrada > 0 ? ` · km ${r.kmSalida}→${r.kmEntrada}${r.kmEntrada > r.kmSalida ? ` (${(r.kmEntrada - r.kmSalida).toFixed(0)} km)` : ""}` : ""}
                  </p>
                  {alertas.length === 0 ? (
                    <span className="text-green-600">✓ Todo OK</span>
                  ) : (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {alertas.map((it) => (
                        <span key={it.campo} className="rounded px-1.5 py-0.5 font-bold" style={{ color: estadoRevisionColor[rr[it.campo]], backgroundColor: `${estadoRevisionColor[rr[it.campo]]}18` }}>
                          {it.icono} {it.label}: {estadoRevisionLabel[rr[it.campo]]}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.observaciones && <p className="mt-1 text-slate-500">📝 {r.observaciones}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Registrar (central) */}
      <form action={registrarGastoVehiculo} className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-bold text-slate-700">Registrar un gasto</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">Tipo
            <select name="tipo" defaultValue="combustible" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
              {TIPOS_GASTO.map((t) => <option key={t} value={t}>{tipoGastoLabel[t]}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Monto $
            <input name="monto" inputMode="numeric" placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">Litros
            <input name="litros" inputMode="decimal" placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">Canal
            <select name="canal" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="">—</option>
              {canales.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
            </select>
          </label>
          <label className="col-span-2 text-xs font-bold text-slate-600 sm:col-span-4">Notas
            <input name="notas" placeholder="Ej: cambio de aceite" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
        </div>
        <button className="mt-2 w-full rounded-lg bg-[#d97706] py-2.5 text-sm font-extrabold text-white active:scale-95">➕ Registrar gasto</button>
      </form>

      {/* Historial */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">Historial de gastos</h2>
      {gastos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aún no hay gastos del vehículo.</p>
      ) : (
        <div className="space-y-1">
          {gastos.map((g) => (
            <div key={g.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
              <span className="min-w-0 truncate">
                {tipoGastoIcono[g.tipo]} <b className="text-[#b45309]">{fmtCLP(Number(g.monto))}</b>
                <span className="text-slate-500"> · {tipoGastoLabel[g.tipo] ?? g.tipo}</span>
                {g.litros > 0 ? <span className="text-slate-500"> · {g.litros} L</span> : ""}
                {g.canal ? <span className="text-slate-400"> · {canalLabel[g.canal] ?? g.canal}</span> : ""}
                {g.notas ? <span className="text-xs text-slate-400"> · {g.notas}</span> : ""}
                <span className="block text-[11px] text-slate-400">{fmtFecha(g.fecha)}{g.nombreUsuario ? ` · ${g.nombreUsuario}` : ""}</span>
              </span>
              <form action={eliminarGastoVehiculo}><input type="hidden" name="id" value={g.id} /><button className="ml-2 shrink-0 text-xs font-semibold text-red-400">quitar</button></form>
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
