import { prisma } from "@/lib/prisma";
import { fmtCant } from "@/lib/dominio/materias";
import { turnoLabel } from "@/lib/dominio/produccion";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function StatCard({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-extrabold" style={{ color }}>{valor}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}

export default async function ControlCalidadPage() {
  const [registros, agregados] = await Promise.all([
    prisma.controlCalidad.findMany({ orderBy: { fecha: "desc" }, take: 120 }),
    prisma.agregadoUso.findMany({ orderBy: { fecha: "desc" }, take: 200 }),
  ]);
  const agsPorControl = new Map<string, typeof agregados>();
  for (const a of agregados) {
    if (!a.controlId) continue;
    if (!agsPorControl.has(a.controlId)) agsPorControl.set(a.controlId, []);
    agsPorControl.get(a.controlId)!.push(a);
  }

  // --- Resumen tipo dashboard ---
  const totalUnidades = registros.reduce((s, r) => s + r.cantidad, 0);
  const completas = registros.filter((r) => r.itemsTotal > 0 && r.itemsMarcados >= r.itemsTotal).length;
  const porTurno = ["manana", "tarde", "noche"].map((t) => ({ t, n: registros.filter((r) => r.turno === t).length }));
  const turnoColor: Record<string, string> = { manana: "#e0921a", tarde: "#1479c4", noche: "#6d28d9" };
  // Top agregados por consumo (suma por insumo).
  const agMap = new Map<string, { unidad: string; total: number }>();
  for (const a of agregados) {
    const cur = agMap.get(a.nombreInsumo) ?? { unidad: a.unidad, total: 0 };
    cur.total += a.cantidad;
    agMap.set(a.nombreInsumo, cur);
  }
  const topAgregados = [...agMap.entries()].map(([nombre, v]) => ({ nombre, ...v })).sort((a, b) => b.total - a.total).slice(0, 6);
  const maxAg = Math.max(1, ...topAgregados.map((a) => a.total));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🧪 Control de calidad y turnos</h1>
      <p className="text-sm text-slate-500">
        Resumen de las mezclas: qué se hizo, turnos, operarios, agregados y rendimiento.
      </p>

      {/* Tarjetas resumen */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Mezclas" valor={String(registros.length)} color="#0f766e" />
        <StatCard label="Unidades" valor={String(totalUnidades)} color="#1479c4" />
        <StatCard label="Recetas completas" valor={`${completas}/${registros.length}`} color="#16a34a" />
        <StatCard label="Agregados usados" valor={String(agMap.size)} color="#b45309" />
      </div>

      {/* Mezclas por turno + top agregados */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Mezclas por turno</p>
          <div className="space-y-1.5">
            {porTurno.map(({ t, n }) => {
              const max = Math.max(1, ...porTurno.map((x) => x.n));
              return (
                <div key={t} className="flex items-center gap-2">
                  <span className="w-16 text-xs font-semibold text-slate-600">{turnoLabel[t] ?? t}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${(n / max) * 100}%`, backgroundColor: turnoColor[t] }} />
                  </div>
                  <span className="w-6 text-right text-sm font-bold text-slate-800">{n}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Agregados más usados</p>
          {topAgregados.length === 0 ? (
            <p className="text-xs text-slate-400">Aún sin agregados.</p>
          ) : (
            <div className="space-y-1.5">
              {topAgregados.map((a) => (
                <div key={a.nombre} className="flex items-center gap-2">
                  <span className="w-24 truncate text-xs font-semibold text-slate-600">{a.nombre}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-[#b45309]" style={{ width: `${(a.total / maxAg) * 100}%` }} />
                  </div>
                  <span className="w-14 text-right text-xs font-bold text-[#b45309]">{fmtCant(a.total, a.unidad)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">Historial</h2>

      {registros.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Aún no hay controles de calidad. Se registran desde la app de Producción al confirmar una mezcla.
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {registros.map((r) => {
            const completo = r.itemsTotal > 0 && r.itemsMarcados >= r.itemsTotal;
            return (
              <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-extrabold text-slate-900">
                      {r.nombre}
                      {r.base ? <span className="font-normal text-teal-700"> · {r.base} {r.baseUnidad ?? ""} de base</span> : null}
                      {r.cantidad > 0 ? <span className="font-normal text-slate-500"> · {r.cantidad} u.</span> : null}
                    </p>
                    <p className="text-xs text-slate-500">
                      📅 {fmtFecha(r.fecha)}
                      {r.turno ? ` · Turno ${turnoLabel[r.turno] ?? r.turno}` : ""}
                      {r.operarios ? ` · 👷 ${r.operarios}` : ""}
                      {r.nombreUsuario ? ` · registró ${r.nombreUsuario}` : ""}
                    </p>
                    {r.lote && <p className="mt-0.5 inline-block rounded bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">Lote {r.lote}</p>}
                  </div>
                  <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${completo ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                    {completo ? "✓ Receta completa" : "⚠ Parcial"} {r.itemsTotal > 0 ? `${r.itemsMarcados}/${r.itemsTotal}` : ""}
                  </span>
                </div>
                {(agsPorControl.get(r.id) ?? []).length > 0 && (
                  <div className="mt-2 rounded-lg bg-amber-50 p-2">
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">Agregados (rendimiento)</p>
                    <ul className="space-y-0.5 text-sm">
                      {(agsPorControl.get(r.id) ?? []).map((a) => (
                        <li key={a.id} className="flex items-center justify-between">
                          <span className="text-slate-700">{a.nombreInsumo} — <b>{fmtCant(a.cantidad, a.unidad)}</b></span>
                          <span className="text-xs text-slate-500">
                            {a.unidadesProducidas > 0 ? `${(a.cantidad / a.unidadesProducidas).toFixed(3).replace(/\.?0+$/, "")} ${a.unidad}/u · rinde ${a.unidadesProducidas} u` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.observaciones && (
                  <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">📝 {r.observaciones}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
