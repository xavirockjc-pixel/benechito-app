import { prisma } from "@/lib/prisma";
import {
  AREAS_MEJORA, areaMejoraLabel, areaMejoraIcono, PRIORIDADES, prioridadLabel, prioridadColor,
  estadoMejoraIcono, siguienteEstado,
} from "@/lib/dominio/mejoras";
import { crearMejora, setEstadoMejora, eliminarMejora } from "./actions";
import MejoraVoz from "./MejoraVoz";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : null);

export default async function MejorasPage() {
  const mejoras = await prisma.mejora.findMany({
    orderBy: [{ estado: "asc" }, { prioridad: "asc" }, { fechaObjetivo: "asc" }, { createdAt: "desc" }],
  });

  const pendientes = mejoras.filter((m) => m.estado === "pendiente");
  const enProceso = mejoras.filter((m) => m.estado === "en_proceso");
  const hechas = mejoras.filter((m) => m.estado === "hecha");
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const proximas = mejoras.filter((m) => m.estado !== "hecha" && m.fechaObjetivo && new Date(m.fechaObjetivo) >= hoy).length;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">🚀 Mejoras y proyecciones</h1>
          <p className="text-sm text-slate-500">Dicta lo que hay que hacer, ponle fecha y ve tachándolo.</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Pendientes" valor={pendientes.length} color="#e23b2c" />
        <Kpi label="En proceso" valor={enProceso.length} color="#f28a1e" />
        <Kpi label="Con fecha" valor={proximas} color="#1479c4" />
        <Kpi label="Cumplidas" valor={hechas.length} color="#2f9e44" />
      </div>

      {/* Dictar por voz */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <MejoraVoz />
        {/* Manual */}
        <details className="mt-3 rounded-xl bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-bold text-slate-600">✍️ Agregar a mano</summary>
          <form action={crearMejora} className="mt-3 space-y-2">
            <input name="titulo" placeholder="Ej: Implementar máquina selladora línea postres" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" required />
            <input name="detalle" placeholder="Detalle (opcional)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <select name="area" defaultValue="general" className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {AREAS_MEJORA.map((a) => <option key={a} value={a}>{areaMejoraIcono[a]} {areaMejoraLabel[a]}</option>)}
              </select>
              <select name="prioridad" defaultValue="media" className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {PRIORIDADES.map((x) => <option key={x} value={x}>{prioridadLabel[x]}</option>)}
              </select>
              <input type="date" name="fechaObjetivo" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" />
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" name="recordar" className="h-4 w-4 accent-[#0f766e]" /> Recordar</label>
            </div>
            <button className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-extrabold text-white active:scale-95">Guardar</button>
          </form>
        </details>
      </div>

      {/* Listas */}
      <Seccion titulo="⭕ Pendientes" items={pendientes} vacia="Nada pendiente. ¡Dicta la próxima mejora!" />
      <Seccion titulo="🔧 En proceso" items={enProceso} vacia="Nada en proceso." />
      <Seccion titulo="✅ Cumplidas" items={hechas} vacia="Aún no hay mejoras cumplidas." tachado />
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="text-2xl font-extrabold text-slate-900">{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

type M = {
  id: string; titulo: string; detalle: string | null; area: string; prioridad: string;
  estado: string; fechaObjetivo: Date | null; recordar: boolean; completadaEn: Date | null;
};

function Seccion({ titulo, items, vacia, tachado }: { titulo: string; items: M[]; vacia: string; tachado?: boolean }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">{titulo} <span className="text-slate-400">({items.length})</span></h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">{vacia}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((m) => {
            const venc = m.fechaObjetivo && m.estado !== "hecha" && new Date(m.fechaObjetivo) < new Date(new Date().setHours(0, 0, 0, 0));
            return (
              <li key={m.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                {/* Avanzar estado */}
                <form action={setEstadoMejora}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="estado" value={siguienteEstado(m.estado)} />
                  <button title="Avanzar estado" className="mt-0.5 text-lg leading-none">{estadoMejoraIcono[m.estado]}</button>
                </form>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold text-slate-900 ${tachado ? "line-through opacity-60" : ""}`}>{m.titulo}</p>
                  {m.detalle && <p className="text-xs text-slate-500">{m.detalle}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-600" style={{ background: "var(--surface-2)" }}>{areaMejoraIcono[m.area]} {areaMejoraLabel[m.area]}</span>
                    {m.estado !== "hecha" && <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${prioridadColor[m.prioridad] ?? ""}`}>{prioridadLabel[m.prioridad]}</span>}
                    {m.fechaObjetivo && <span className={`text-[11px] font-semibold ${venc ? "text-rose-600" : "text-slate-500"}`}>📅 {fmtFecha(m.fechaObjetivo)}{venc ? " · vencida" : ""}</span>}
                    {m.recordar && m.estado !== "hecha" && <span className="text-[11px] text-slate-400">🔔</span>}
                    {m.completadaEn && <span className="text-[11px] text-emerald-600">✓ {fmtFecha(m.completadaEn)}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  {m.estado !== "hecha" && (
                    <form action={setEstadoMejora}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="estado" value="hecha" />
                      <button className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white active:scale-95">✓ Cumplir</button>
                    </form>
                  )}
                  <form action={eliminarMejora}><input type="hidden" name="id" value={m.id} /><button className="text-xs text-slate-400 hover:text-red-500">✕</button></form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
