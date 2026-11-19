import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { pendientesCerebro } from "@/lib/dominio/cerebroPendientes";
import { areaMejoraIcono, prioridadColor, PRIORIDADES, prioridadLabel } from "@/lib/dominio/mejoras";
import { tipoNotaIcono } from "@/lib/dominio/notas";
import { crearMejora, setEstadoMejora } from "@/app/admin/mejoras/actions";
import { toggleNota } from "@/app/notas/actions";
import { cambiarEstadoAgenda } from "@/app/admin/agenda/actions";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : null);
const AGENDA_ICONO: Record<string, string> = { apartar: "📦", mezclar: "🍥", fabricar: "🏭", entrega: "🚚", express: "⚡", visita: "🧍", retiro: "📥", otro: "📌" };

/**
 * Gestor: un solo lugar para las tareas del negocio. Junta lo que el CEREBRO
 * detecta, lo que hay POR HACER (mejoras + notas), la AGENDA próxima y las
 * NOTAS/ideas. Reutiliza las pantallas existentes (no duplica datos).
 */
export default async function GestorPage() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);

  const [cerebro, mejoras, notas, agenda] = await Promise.all([
    pendientesCerebro(),
    prisma.mejora.findMany({ where: { estado: { not: "hecha" } }, orderBy: [{ prioridad: "asc" }, { fechaObjetivo: "asc" }, { createdAt: "desc" }], take: 50 }),
    prisma.nota.findMany({ where: { estado: "abierta" }, orderBy: [{ prioridad: "asc" }, { createdAt: "desc" }], take: 80 }),
    prisma.agenda.findMany({ where: { estado: { in: ["pendiente", "en_proceso"] } }, orderBy: { fecha: "asc" }, take: 40 }),
  ]);

  const notasTarea = notas.filter((n) => n.tipo === "tarea" || n.tipo === "recordatorio");
  const notasIdea = notas.filter((n) => n.tipo === "observacion" || n.tipo === "idea");
  const porHacer = mejoras.length + notasTarea.length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">🗂️ Gestor</h1>
        <p className="text-sm text-slate-500">Todo lo que hay que hacer, en un solo lugar: avisos del cerebro, tareas, agenda y notas.</p>
      </div>

      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-3">
        <Kpi label="Avisos" valor={cerebro.length} color="#e23b2c" />
        <Kpi label="Por hacer" valor={porHacer} color="#f28a1e" />
        <Kpi label="Agenda" valor={agenda.length} color="#1479c4" />
      </div>

      {/* Agregar tarea rápida */}
      <form action={crearMejora} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-sm font-extrabold text-slate-800">➕ Nueva tarea</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input name="titulo" required placeholder="¿Qué hay que hacer?" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <select name="prioridad" defaultValue="media" className="rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm">
            {PRIORIDADES.map((p) => <option key={p} value={p}>{prioridadLabel[p]}</option>)}
          </select>
          <input type="date" name="fechaObjetivo" className="rounded-lg border border-slate-300 px-2 py-2.5 text-sm" />
          <button className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white active:brightness-110">Agregar</button>
        </div>
      </form>

      {/* 🐝 Del cerebro */}
      {cerebro.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">🐝 El cerebro detectó</h2>
          {cerebro.map((p) => (
            <div key={p.clave} className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${p.tono === "alerta" ? "border-red-200 bg-red-50" : p.tono === "aviso" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"}`}>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800">{p.icono} {p.titulo}</p>
                <p className="text-xs text-slate-500">{p.detalle}</p>
              </div>
              <Link href={p.href} className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">{p.cta}</Link>
            </div>
          ))}
        </section>
      )}

      {/* ✅ Por hacer (mejoras + notas-tarea) */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">✅ Por hacer ({porHacer})</h2>
        {porHacer === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Nada pendiente. 🎉</p>
        ) : (
          <ul className="space-y-1.5">
            {mejoras.map((m) => (
              <li key={m.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
                <form action={setEstadoMejora}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="estado" value="hecha" />
                  <button className="grid h-6 w-6 place-items-center rounded-full border-2 border-slate-300 text-xs text-transparent hover:border-emerald-500 hover:text-emerald-500">✓</button>
                </form>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800">{areaMejoraIcono[m.area] ?? "•"} {m.titulo}</span>
                  <span className="text-[11px] text-slate-400">{m.estado === "en_proceso" ? "🔧 en proceso · " : ""}{fmtFecha(m.fechaObjetivo) ? `📅 ${fmtFecha(m.fechaObjetivo)}` : ""}</span>
                </span>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: prioridadColor[m.prioridad] ?? "#94a3b8" }}>{prioridadLabel[m.prioridad]}</span>
              </li>
            ))}
            {notasTarea.map((n) => (
              <li key={n.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
                <form action={toggleNota}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="grid h-6 w-6 place-items-center rounded-full border-2 border-slate-300 text-xs text-transparent hover:border-emerald-500 hover:text-emerald-500">✓</button>
                </form>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-800">{tipoNotaIcono[n.tipo] ?? "📝"} {n.texto}</span>
                  <span className="text-[11px] text-slate-400">{n.autor ? `${n.autor} · ` : ""}{fmtFecha(n.fechaObjetivo) ? `📅 ${fmtFecha(n.fechaObjetivo)}` : "nota"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 🗓️ Agenda próxima */}
      {agenda.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">🗓️ Agenda ({agenda.length})</h2>
          <ul className="space-y-1.5">
            {agenda.map((a) => {
              const vencida = new Date(a.fecha) < hoy;
              return (
                <li key={a.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
                  <form action={cambiarEstadoAgenda}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="estado" value="hecho" />
                    <button className="grid h-6 w-6 place-items-center rounded-full border-2 border-slate-300 text-xs text-transparent hover:border-emerald-500 hover:text-emerald-500">✓</button>
                  </form>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">{AGENDA_ICONO[a.tipo] ?? "📌"} {a.titulo}</span>
                    <span className={`text-[11px] ${vencida ? "font-bold text-red-500" : "text-slate-400"}`}>{a.estado === "en_proceso" ? "🔧 en proceso · " : ""}{fmtFecha(a.fecha)}{vencida ? " · atrasada" : ""}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* 📝 Notas e ideas (plegado) */}
      {notasIdea.length > 0 && (
        <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer text-sm font-bold text-slate-700">📝 Notas e ideas ({notasIdea.length})</summary>
          <ul className="mt-2 space-y-1.5">
            {notasIdea.map((n) => (
              <li key={n.id} className="flex items-center gap-2 py-1 text-sm">
                <form action={toggleNota}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="grid h-5 w-5 place-items-center rounded-full border-2 border-slate-300 text-[10px] text-transparent hover:border-emerald-500 hover:text-emerald-500">✓</button>
                </form>
                <span className="min-w-0 flex-1 text-slate-700">{tipoNotaIcono[n.tipo] ?? "💡"} {n.texto}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Accesos a las pantallas completas (detalle) */}
      <div className="flex flex-wrap gap-2 pt-1 text-xs">
        <Link href="/admin/mejoras" className="rounded-full bg-slate-100 px-3 py-1.5 font-bold text-slate-600">Mejoras ↗</Link>
        <Link href="/admin/notas" className="rounded-full bg-slate-100 px-3 py-1.5 font-bold text-slate-600">Notas ↗</Link>
        <Link href="/admin/agenda" className="rounded-full bg-slate-100 px-3 py-1.5 font-bold text-slate-600">Agenda ↗</Link>
        <Link href="/admin/recordatorios" className="rounded-full bg-slate-100 px-3 py-1.5 font-bold text-slate-600">Recordatorios clientes ↗</Link>
      </div>
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <p className="text-2xl font-extrabold" style={{ color }}>{valor}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
