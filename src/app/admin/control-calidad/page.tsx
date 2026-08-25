import { prisma } from "@/lib/prisma";
import { fmtCant } from "@/lib/dominio/materias";
import { turnoLabel } from "@/lib/dominio/produccion";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

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

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🧪 Control de calidad y turnos</h1>
      <p className="text-sm text-slate-500">
        Historial de las mezclas: qué se hizo, cuántos, qué insumos se marcaron, turno, operarios y observaciones.
      </p>

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
                    <p className="font-extrabold text-slate-900">{r.nombre} <span className="font-normal text-slate-500">· {r.cantidad} u.</span></p>
                    <p className="text-xs text-slate-500">
                      📅 {fmtFecha(r.fecha)}
                      {r.turno ? ` · Turno ${turnoLabel[r.turno] ?? r.turno}` : ""}
                      {r.operarios ? ` · 👷 ${r.operarios}` : ""}
                      {r.nombreUsuario ? ` · registró ${r.nombreUsuario}` : ""}
                    </p>
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
