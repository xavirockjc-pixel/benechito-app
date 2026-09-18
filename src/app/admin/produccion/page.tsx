import { prisma } from "@/lib/prisma";
import { LINEAS_PRODUCCION, lineaLabel } from "@/lib/dominio/produccion";
import { crearRecomendacion, toggleRecomendacion, eliminarRecomendacion } from "./actions";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500";

export default async function ProduccionPage({ searchParams }: { searchParams: Promise<{ rec?: string }> }) {
  const { rec } = await searchParams;
  const recomendaciones = await prisma.recomendacionProduccion.findMany({ orderBy: [{ activo: "desc" }, { createdAt: "desc" }], take: 60 });
  const activas = recomendaciones.filter((r) => r.activo);
  const inactivas = recomendaciones.filter((r) => !r.activo);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-slate-900">Producción</h1>
      <p className="text-sm text-slate-500">
        Deja notas/recomendaciones para el equipo de Producción. Aparecen en su app cuando eligen ese producto —
        como <b>sugerencia, no obligación</b>. Actívalas solo cuando haga falta.
      </p>

      {rec && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 ring-1 ring-green-200">✅ Nota enviada a Producción.</p>}

      {/* Nueva nota / recomendación */}
      <form action={crearRecomendacion} className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-bold text-slate-900">📝 Nueva nota para Producción</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">¿Para qué producto?
            <select name="linea" defaultValue="" className={`mt-1 ${inputCls}`}>
              <option value="">Todos</option>
              {LINEAS_PRODUCCION.map((l) => <option key={l} value={l}>{lineaLabel[l] ?? l}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700 sm:col-span-2">Nota (recomendación)
            <input name="texto" required placeholder="Ej: esta semana priorizar frutilla · ojo, falta estabilizante" className={`mt-1 ${inputCls}`} />
          </label>
        </div>
        <button className="mt-4 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">
          Enviar a Producción
        </button>
        <p className="mt-2 text-xs text-slate-400">La verá el operario al elegir ese producto en su app. No lo obliga a nada.</p>
      </form>

      {/* Notas activas */}
      <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">Notas activas {activas.length > 0 && <span className="text-slate-400">({activas.length})</span>}</h2>
      {activas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No hay notas activas. Producción no verá ninguna recomendación ahora mismo.
        </p>
      ) : (
        <ul className="space-y-2">
          {activas.map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50/50 p-3">
              <div className="min-w-0">
                <span className="mr-2 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-bold text-teal-700">
                  {r.linea ? (lineaLabel[r.linea] ?? r.linea) : "Todos"}
                </span>
                <span className="text-sm font-semibold text-slate-800">{r.texto}</span>
                <p className="mt-0.5 text-[11px] text-slate-400">{fmt(r.createdAt)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={toggleRecomendacion}><input type="hidden" name="id" value={r.id} /><button className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200">Ocultar</button></form>
                <form action={eliminarRecomendacion}><input type="hidden" name="id" value={r.id} /><button className="rounded-lg px-2 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">✕</button></form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Ocultas (historial) */}
      {inactivas.length > 0 && (
        <details className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-bold text-slate-600">Ocultas ({inactivas.length})</summary>
          <ul className="mt-2 space-y-1">
            {inactivas.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-1 text-sm">
                <span className="min-w-0 truncate text-slate-400">
                  <b className="text-slate-500">{r.linea ? (lineaLabel[r.linea] ?? r.linea) : "Todos"}:</b> {r.texto}
                </span>
                <div className="flex shrink-0 gap-2">
                  <form action={toggleRecomendacion}><input type="hidden" name="id" value={r.id} /><button className="text-[11px] font-bold text-teal-600">reactivar</button></form>
                  <form action={eliminarRecomendacion}><input type="hidden" name="id" value={r.id} /><button className="text-[11px] font-bold text-red-400">borrar</button></form>
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
