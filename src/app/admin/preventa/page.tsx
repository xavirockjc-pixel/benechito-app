import { prisma } from "@/lib/prisma";
import {
  ESTADOS_PREVENTA,
  estadoPreventaLabel,
  estadoPreventaColor,
  MENSAJE_PREVENTA_DEFAULT,
} from "@/lib/dominio/preventa";
import { enviarPreventa, marcarResultado, eliminarPreventa } from "./actions";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function PreventaPage() {
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const [clientes, preventas, agendasTerreno, n8nOk] = await Promise.all([
    prisma.negocio.findMany({
      where: { whatsapp: { not: "" } },
      orderBy: { nombreNegocio: "asc" },
      select: { id: true, nombreNegocio: true, comuna: true, whatsapp: true },
    }),
    prisma.preventa.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { negocio: { select: { nombreNegocio: true } } },
    }),
    // Reservas / visitas / entregas agendadas por los vendedores en terreno.
    prisma.agenda.findMany({
      where: { tipo: { in: ["visita", "entrega", "express"] }, fecha: { gte: inicioHoy }, estado: { in: ["pendiente", "en_proceso"] } },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
      take: 60,
    }),
    Promise.resolve(Boolean(process.env.N8N_PREVENTA_WEBHOOK_URL)),
  ]);

  const tipoTerreno: Record<string, { l: string; c: string }> = {
    visita: { l: "🗓️ Visita", c: "text-violet-700 bg-violet-50" },
    entrega: { l: "📅 Entrega", c: "text-blue-700 bg-blue-50" },
    express: { l: "🛵 Exprés", c: "text-orange-700 bg-orange-50" },
  };
  const fmtDia = (d: Date) =>
    new Date(d).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">Preventa por WhatsApp</h1>
      <p className="text-sm text-slate-500">
        Contacta a los clientes antes de la ruta. El envío va por tu n8n + Evolution; el resultado
        alimenta la planificación.
      </p>

      {!n8nOk && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          ⚠️ Falta configurar <code>N8N_PREVENTA_WEBHOOK_URL</code> en el <code>.env</code>. Sin eso se
          registra la preventa pero no se envía el WhatsApp.
        </p>
      )}

      {/* Enviar preventa */}
      <form action={enviarPreventa} className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block text-sm font-bold text-slate-700">
          Mensaje <span className="font-normal text-slate-400">(usa {"{nombre}"} para personalizar)</span>
          <textarea
            name="mensaje"
            rows={3}
            defaultValue={MENSAJE_PREVENTA_DEFAULT}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500"
          />
        </label>

        <p className="mt-4 mb-2 text-sm font-bold text-slate-700">Clientes a contactar ({clientes.length})</p>
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {clientes.length === 0 && <p className="p-3 text-sm text-slate-500">No hay clientes con WhatsApp.</p>}
          {clientes.map((c) => (
            <label key={c.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-slate-50">
              <input type="checkbox" name="negocioIds" value={c.id} className="h-4 w-4 accent-[#1479c4]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-800">{c.nombreNegocio}</span>
                <span className="block truncate text-xs text-slate-400">{c.comuna} · {c.whatsapp}</span>
              </span>
            </label>
          ))}
        </div>

        <button className="mt-4 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">
          Enviar preventa
        </button>
      </form>

      {/* Reservas y visitas agendadas por los vendedores en terreno */}
      <h2 className="mt-8 mb-1 text-lg font-bold text-slate-900">Reservas y visitas de terreno</h2>
      <p className="mb-3 text-xs text-slate-500">Lo que los vendedores agendaron en ruta (próximas visitas con reserva, entregas y exprés).</p>
      {agendasTerreno.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Sin reservas ni visitas agendadas por ahora.
        </p>
      ) : (
        <div className="space-y-2">
          {agendasTerreno.map((a) => {
            const t = tipoTerreno[a.tipo] ?? { l: a.tipo, c: "text-slate-600 bg-slate-100" };
            return (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{a.titulo}</p>
                  {a.notas && <p className="truncate text-xs text-slate-500">📦 {a.notas}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-xs font-semibold text-slate-500">{fmtDia(a.fecha)}</span>
                  <span className={`rounded-md px-2 py-1 text-xs font-bold ${t.c}`}>{t.l}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resultados */}
      <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">Preventas recientes</h2>
      {preventas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Aún no has enviado preventas.
        </p>
      ) : (
        <div className="space-y-2">
          {preventas.map((pv) => {
            const c = estadoPreventaColor[pv.estado];
            return (
              <div key={pv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{pv.negocio.nombreNegocio}</p>
                  <p className="text-xs text-slate-400">{fmtHora(pv.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ color: c?.color, backgroundColor: c?.bg }}>
                    {estadoPreventaLabel[pv.estado] ?? pv.estado}
                  </span>
                  <form action={marcarResultado} className="flex items-center gap-1">
                    <input type="hidden" name="preventaId" value={pv.id} />
                    <select name="estado" defaultValue={pv.estado} className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs">
                      {ESTADOS_PREVENTA.map((e) => <option key={e} value={e}>{estadoPreventaLabel[e]}</option>)}
                    </select>
                    <button className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-bold text-white">Guardar</button>
                  </form>
                  <form action={eliminarPreventa}>
                    <input type="hidden" name="preventaId" value={pv.id} />
                    <button className="text-xs text-rojo/60 hover:text-rojo">✕</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
