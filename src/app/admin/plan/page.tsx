import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { areaMejoraIcono, areaMejoraLabel, prioridadColor } from "@/lib/dominio/mejoras";
import { setEstadoMejora } from "@/app/admin/mejoras/actions";
import { crearPlanCentralizacion } from "./actions";

export const dynamic = "force-dynamic";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtFecha = (d: Date | null) => (d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : null);

export default async function SocioPlanPage() {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const hace90 = new Date(hoy.getTime() - 90 * 86400000);

  const [mejoras, completadas] = await Promise.all([
    prisma.mejora.findMany({ orderBy: [{ estado: "asc" }, { prioridad: "asc" }, { fechaObjetivo: "asc" }], take: 400 }),
    prisma.mejora.findMany({ where: { completadaEn: { gte: hace90 } }, select: { completadaEn: true } }),
  ]);

  // --- Racha de cumplimiento: días seguidos (hasta hoy/ayer) con algo cumplido ---
  const diasHechos = new Set(completadas.map((m) => iso(new Date(m.completadaEn!))));
  const hoyHecho = diasHechos.has(iso(hoy));
  let racha = 0;
  const cursor = new Date(hoy);
  if (!hoyHecho) cursor.setDate(cursor.getDate() - 1); // la racha sigue viva hasta ayer
  while (diasHechos.has(iso(cursor))) { racha++; cursor.setDate(cursor.getDate() - 1); }
  const totalCumplidas = mejoras.filter((m) => m.estado === "hecha").length;

  // --- Meta de centralización ---
  const plan = mejoras.filter((m) => m.titulo.startsWith("Centralizar"));
  const planHechas = plan.filter((m) => m.estado === "hecha").length;
  const planObjetivo = plan.find((m) => m.fechaObjetivo)?.fechaObjetivo ?? null;
  const diasRestantes = planObjetivo ? Math.ceil((new Date(planObjetivo).getTime() - hoy.getTime()) / 86400000) : null;

  // --- Plan por área (lo que falta) ---
  const abiertas = mejoras.filter((m) => m.estado !== "hecha" && !m.titulo.startsWith("Centralizar"));
  const porArea = new Map<string, typeof abiertas>();
  for (const m of abiertas) { if (!porArea.has(m.area)) porArea.set(m.area, []); porArea.get(m.area)!.push(m); }

  // --- Esta semana ---
  const finSemana = new Date(hoy); finSemana.setDate(hoy.getDate() + (7 - ((hoy.getDay() + 6) % 7)));
  const estaSemana = mejoras.filter((m) => m.estado !== "hecha" && m.fechaObjetivo && new Date(m.fechaObjetivo) <= finSemana);

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-[#1479c4]">← Panel</Link>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">🐝 Socio · Plan de mejoras</h1>
        <p className="text-sm text-slate-500">Mejora continua: tu racha, tu plan y la meta de centralización. A tu ritmo.</p>
      </div>

      {/* Racha */}
      <section className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-4 shadow-sm">
        <div className="text-center">
          <p className="text-4xl font-extrabold text-orange-600">{racha}🔥</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-orange-700">días de racha</p>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">{hoyHecho ? "¡Hoy ya cumpliste! 💪" : racha > 0 ? "Cumple una hoy para no cortar la racha 🙌" : "Cumple una meta hoy y arranca tu racha 🚀"}</p>
          <p className="text-xs text-slate-500">{totalCumplidas} mejoras cumplidas en total.</p>
        </div>
      </section>

      {/* Meta de centralización */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-extrabold text-slate-900">🎯 Meta: centralizar cada área</h2>
        {plan.length === 0 ? (
          <>
            <p className="mb-2 mt-1 text-xs text-slate-500">Que todo lo que entra, sale, producción y ventas quede centralizado. Arma el plan con fecha (~1½ semanas).</p>
            <form action={crearPlanCentralizacion}>
              <button className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-extrabold text-white active:brightness-110">Crear plan de centralización</button>
            </form>
          </>
        ) : (
          <>
            <div className="mb-2 mt-1 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600">{planHechas}/{plan.length} áreas</span>
              {diasRestantes != null && <span className={`font-bold ${diasRestantes < 0 ? "text-red-600" : diasRestantes <= 3 ? "text-amber-600" : "text-slate-500"}`}>{diasRestantes < 0 ? `${-diasRestantes} días atrasado` : `faltan ${diasRestantes} días`}</span>}
            </div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${plan.length ? (planHechas / plan.length) * 100 : 0}%` }} />
            </div>
            <ul className="space-y-1.5">
              {plan.map((m) => (
                <li key={m.id} className="flex items-center gap-2">
                  <form action={setEstadoMejora}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="estado" value={m.estado === "hecha" ? "pendiente" : "hecha"} />
                    <button className={`grid h-6 w-6 place-items-center rounded-full border-2 text-xs ${m.estado === "hecha" ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500"}`}>✓</button>
                  </form>
                  <span className={`min-w-0 flex-1 truncate text-sm ${m.estado === "hecha" ? "text-slate-400 line-through" : "font-semibold text-slate-800"}`}>{m.titulo}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      {/* Esta semana */}
      {estaSemana.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">📌 Esta semana ({estaSemana.length})</h2>
          <ul className="space-y-1.5">
            {estaSemana.map((m) => (
              <li key={m.id} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2.5">
                <form action={setEstadoMejora}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="estado" value="hecha" />
                  <button className="grid h-6 w-6 place-items-center rounded-full border-2 border-slate-300 text-xs text-transparent hover:border-emerald-500 hover:text-emerald-500">✓</button>
                </form>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{areaMejoraIcono[m.area] ?? "•"} {m.titulo}</span>
                {m.fechaObjetivo && <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: prioridadColor[m.prioridad] ?? "#94a3b8" }}>📅 {fmtFecha(m.fechaObjetivo)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Plan por área */}
      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">🗂️ Plan por área</h2>
        {porArea.size === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Nada pendiente en el plan. 🎉 Agrega mejoras en el Gestor.</p>
        ) : (
          <div className="space-y-3">
            {[...porArea.entries()].map(([area, items]) => (
              <div key={area} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="mb-1 text-sm font-extrabold text-slate-800">{areaMejoraIcono[area] ?? "•"} {areaMejoraLabel[area] ?? area} <span className="font-normal text-slate-400">({items.length})</span></p>
                <ul className="space-y-1">
                  {items.slice(0, 8).map((m) => (
                    <li key={m.id} className="flex items-center gap-2 text-sm">
                      <form action={setEstadoMejora}>
                        <input type="hidden" name="id" value={m.id} />
                        <input type="hidden" name="estado" value="hecha" />
                        <button className="grid h-5 w-5 place-items-center rounded-full border-2 border-slate-300 text-[10px] text-transparent hover:border-emerald-500 hover:text-emerald-500">✓</button>
                      </form>
                      <span className="min-w-0 flex-1 truncate text-slate-700">{m.estado === "en_proceso" ? "🔧 " : ""}{m.titulo}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <Link href="/admin/gestor" className="block rounded-xl bg-slate-100 py-2.5 text-center text-sm font-bold text-slate-600">🗂️ Ir al Gestor (agregar/editar tareas) →</Link>
    </div>
  );
}
