import { prisma } from "@/lib/prisma";
import { inicioDelDia } from "@/lib/dominio/empresa";
import { prioridadColor, estadoMejoraIcono } from "@/lib/dominio/mejoras";
import { avanzarMejoraProd } from "./actions";
import PendienteVoz from "./PendienteVoz";
import GastoRapido from "./GastoRapido";
import { registrarAcceso } from "@/lib/dominio/accesos";

export const dynamic = "force-dynamic";

const fmtCLP = (n: number) => "$" + n.toLocaleString("es-CL");

const fmtFecha = (d: Date | null) =>
  d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" }) : null;
const fmtHora = (d: Date | null) => {
  if (!d) return null;
  const x = new Date(d);
  return x.getHours() || x.getMinutes() ? x.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" }) : null;
};

export default async function MantenimientoProd({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await searchParams;
  await registrarAcceso("produccion", "Socio Benechito / Mantenimiento");
  const hoy = await inicioDelDia();
  const finHoy = new Date(hoy.getTime() + 24 * 3600 * 1000);
  const hace30 = new Date(hoy.getTime() - 30 * 24 * 3600 * 1000);

  const [mejoras, recordatorios, negativos, gastos] = await Promise.all([
    // Mejoras de producción (y generales) que siguen abiertas.
    prisma.mejora.findMany({
      where: { estado: { not: "hecha" }, area: { in: ["produccion", "general", "calidad"] } },
      orderBy: [{ estado: "asc" }, { prioridad: "asc" }, { fechaObjetivo: "asc" }, { createdAt: "desc" }],
      take: 30,
    }),
    // Recordatorios/tareas con fecha para hoy o vencidas (de producción o generales).
    prisma.nota.findMany({
      where: {
        estado: { not: "hecha" },
        tipo: { in: ["recordatorio", "tarea"] },
        area: { in: ["produccion", "general", "inventario", "calidad"] },
        fechaObjetivo: { not: null, lt: finHoy },
      },
      orderBy: { fechaObjetivo: "asc" },
      take: 12,
      select: { id: true, texto: true, fechaObjetivo: true, autor: true },
    }),
    // Stock en negativo (alerta que el socio querría ver).
    prisma.stock.count({ where: { cantidad: { lt: 0 } } }),
    // Compras/gastos registrados desde producción (últimos 30 días).
    prisma.gasto.findMany({
      where: { origen: "produccion", fecha: { gte: hace30 } },
      orderBy: { fecha: "desc" },
      take: 10,
      select: { id: true, concepto: true, monto: true, categoria: true, proveedor: true, fecha: true },
    }),
  ]);

  const enProceso = mejoras.filter((m) => m.estado === "en_proceso");
  const porHacer = mejoras.filter((m) => m.estado === "pendiente");
  const gastoMes = gastos.reduce((s, g) => s + Number(g.monto), 0);

  return (
    <div className="space-y-5">
      {/* Cabecera socio */}
      <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-amber-500 p-4 text-amber-950 shadow-sm">
        <h1 className="flex items-center gap-2 text-lg font-extrabold">🐝 Socio Benechito</h1>
        <p className="mt-1 text-sm font-semibold leading-snug">
          Mantenimiento, mejoras y pendientes del equipo. Lo que anotes aquí no se olvida:
          el socio te lo recuerda y lo manda en el reporte del día.
        </p>
      </div>

      {/* Anotar pendiente/mejora */}
      <PendienteVoz />

      {/* En proceso */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">🔧 En proceso ({enProceso.length})</h2>
        {enProceso.length === 0 ? (
          <p className="text-sm text-slate-500">Nada en marcha ahora mismo.</p>
        ) : (
          <ul className="space-y-2">
            {enProceso.map((m) => (
              <MejoraItem key={m.id} m={m} siguiente="Listo ✅" />
            ))}
          </ul>
        )}
      </section>

      {/* Por hacer */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">⭕ Por hacer ({porHacer.length})</h2>
        {porHacer.length === 0 ? (
          <p className="text-sm text-slate-500">Sin pendientes. ¡Buen trabajo! 🎉</p>
        ) : (
          <ul className="space-y-2">
            {porHacer.map((m) => (
              <MejoraItem key={m.id} m={m} siguiente="Empezar 🔧" />
            ))}
          </ul>
        )}
      </section>

      {/* Recordatorios y tareas con fecha */}
      {recordatorios.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold text-slate-900">🔔 Recordatorios de hoy ({recordatorios.length})</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {recordatorios.map((r) => {
              const venc = r.fechaObjetivo && new Date(r.fechaObjetivo) < hoy;
              const h = fmtHora(r.fechaObjetivo);
              const f = fmtFecha(r.fechaObjetivo);
              return (
                <li key={r.id} className="py-1.5">
                  <span className="text-slate-800">{r.texto}</span>
                  {h && <span className="ml-1 text-xs font-semibold text-sky-700">— {h}</span>}
                  {venc && <span className="ml-1 text-xs font-semibold text-rose-600">(⚠️ venció {f})</span>}
                  {r.autor && <span className="block text-[11px] text-slate-400">👤 {r.autor}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Aviso del cerebro */}
      {negativos > 0 && (
        <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-bold text-rose-700">
            ➖ {negativos} producto{negativos > 1 ? "s" : ""} con stock en negativo
          </p>
          <p className="mt-0.5 text-xs text-rose-600">
            Se usó o vendió algo que no se había ingresado. Avisa al socio para corregir el conteo.
          </p>
        </section>
      )}

      {/* Control de gastos / compras */}
      <GastoRapido />

      {gastos.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">💸 Últimas compras</h2>
            <span className="text-xs font-semibold text-emerald-700">{fmtCLP(gastoMes)} · 30 días</span>
          </div>
          <ul className="divide-y divide-slate-100 text-sm">
            {gastos.map((g) => (
              <li key={g.id} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0">
                  <span className="text-slate-800">{g.concepto}</span>
                  <span className="block text-[11px] text-slate-400">
                    {g.categoria ?? "otros"}{g.proveedor ? ` · ${g.proveedor}` : ""} · {new Date(g.fecha).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}
                  </span>
                </span>
                <span className="shrink-0 font-bold text-slate-700">{fmtCLP(Number(g.monto))}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">Estas compras quedan en Finanzas de la central.</p>
        </section>
      )}

      <p className="px-1 text-center text-[11px] leading-tight text-slate-400">
        Todo lo que anotes le llega al socio y aparece en el reporte diario. Así nadie tiene que acordarse por ti. 🐝
      </p>
    </div>
  );
}

function MejoraItem({
  m,
  siguiente,
}: {
  m: { id: string; titulo: string; detalle: string | null; prioridad: string; estado: string; fechaObjetivo: Date | null };
  siguiente: string;
}) {
  const f = fmtFecha(m.fechaObjetivo);
  return (
    <li className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">
          <span className="mr-1">{estadoMejoraIcono[m.estado]}</span>
          {m.titulo}
        </p>
        {m.detalle && <p className="text-xs text-slate-500">{m.detalle}</p>}
        <div className="mt-1 flex items-center gap-1.5">
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${prioridadColor[m.prioridad]}`}>
            {m.prioridad === "alta" ? "Alta" : m.prioridad === "media" ? "Media" : "Baja"}
          </span>
          {f && <span className="text-[11px] text-slate-400">📅 {f}</span>}
        </div>
      </div>
      <form action={avanzarMejoraProd} className="shrink-0">
        <input type="hidden" name="id" value={m.id} />
        <input type="hidden" name="estado" value={m.estado} />
        <button className="rounded-lg bg-[#0f766e] px-2.5 py-1.5 text-xs font-bold text-white active:opacity-80">
          {siguiente}
        </button>
      </form>
    </li>
  );
}
