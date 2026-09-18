import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import ProduccionForm from "./ProduccionForm";
import { fechaCorta } from "@/lib/dominio/agenda";
import { lineaLabel } from "@/lib/dominio/produccion";
import { inicioDelDia } from "@/lib/dominio/empresa";
import { cumplirOrden } from "./actions";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export default async function ProduccionHome({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;

  const bodega = await prisma.ubicacion.findFirst({ where: { tipo: "bodega" } });
  if (!bodega) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Producción</h1>
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No hay una bodega configurada. Créala en el panel (Inventario → Ubicaciones).
        </p>
      </div>
    );
  }

  const hoy = await inicioDelDia();
  const yo = await usuarioActual();

  const [ordenes, agendaFab, registroHoy, saboresAll, equipoTratoRaw] = await Promise.all([
    prisma.ordenProduccion.findMany({
      where: { estado: { in: ["planificada", "en_proceso"] } },
      include: { producto: { select: { nombre: true } }, sabor: { select: { nombre: true, linea: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.agenda.findMany({
      where: { tipo: { in: ["fabricar", "mezclar"] }, estado: { in: ["pendiente", "en_proceso"] } },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
      take: 20,
    }),
    prisma.movimientoBodega.findMany({ where: { fecha: { gte: hoy }, zona: "produccion" }, orderBy: { fecha: "desc" }, take: 100 }),
    prisma.sabor.findMany({ where: { activo: true }, select: { nombre: true, linea: true }, orderBy: { nombre: "asc" } }),
    prisma.trabajador.findMany({
      where: { activo: true, modalidadPago: "por_trato", usuarioId: { not: null } },
      select: { usuarioId: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const saboresPorLinea: Record<string, string[]> = {};
  for (const s of saboresAll) (saboresPorLinea[s.linea] ??= []).push(s.nombre);
  const saboresProd: Record<string, string[]> = {};
  for (const l of ["tuyyo", "paletas", "paletas_premium", "postres_500", "cassatas", "trufas", "cuchufli"]) {
    const alias = l === "trufas" ? ["trufas", "trufa"] : [l];
    saboresProd[l] = [...new Set(alias.flatMap((a) => saboresPorLinea[a] ?? []))];
  }
  const equipoTrato = equipoTratoRaw.map((t) => ({ usuarioId: t.usuarioId as string, nombre: t.nombre }));
  const totalHoy = registroHoy.reduce((s, m) => s + m.cantidad, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🏭 Producción</h1>
        <p className="text-xs text-slate-500">Anota el reporte del turno. Simple y rápido.</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/produccion/checklist" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 shadow-sm active:bg-slate-50">
          🧼 Higiene y BPM
        </Link>
        <Link href="/produccion/bitacora" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 shadow-sm active:bg-slate-50">
          📓 Bitácora
        </Link>
      </div>

      {ok && <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Reporte del turno enviado. ¡Gracias!</p>}

      {/* Qué toca hoy (si la central dejó órdenes o agendados) */}
      {(ordenes.length > 0 || agendaFab.length > 0) && (
        <section className="rounded-2xl border-2 border-teal-300 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-base font-extrabold text-teal-800">📋 ¿Qué toca hoy?</h2>
          {agendaFab.length > 0 && (
            <ul className="mb-2 space-y-1">
              {agendaFab.map((a) => (
                <li key={a.id} className="flex items-center justify-between rounded-lg bg-teal-50 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate font-semibold text-slate-800">🗓️ {a.titulo}{a.notas ? ` — ${a.notas}` : ""}</span>
                  <span className="ml-2 shrink-0 text-xs font-bold text-teal-700">{fechaCorta(a.fecha)}{a.cantidad ? ` · ${a.cantidad}` : ""}</span>
                </li>
              ))}
            </ul>
          )}
          {ordenes.length > 0 && (
            <ul className="space-y-2">
              {ordenes.map((o) => {
                const nombre = o.saborId
                  ? `${o.sabor?.nombre ?? ""} · ${lineaLabel[o.sabor?.linea ?? ""] ?? o.sabor?.linea ?? ""}`
                  : o.producto?.nombre ?? "Producto";
                return (
                  <li key={o.id} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">{nombre}</span>
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-700">Hacer {o.cantidadPlan}</span>
                    </div>
                    {o.notas && <p className="mt-0.5 text-xs text-slate-500">📝 {o.notas}</p>}
                    <form action={cumplirOrden} className="mt-2 flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={o.id} />
                      <label className="text-xs font-bold text-slate-600">Hice
                        <input type="number" name="cantidadReal" min="0" step="1" defaultValue={o.cantidadPlan} inputMode="numeric"
                          className="mt-1 w-20 rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
                      </label>
                      <label className="text-xs font-bold text-slate-600">Merma
                        <input type="number" name="merma" min="0" step="1" defaultValue="0" inputMode="numeric"
                          className="mt-1 w-16 rounded-lg border border-slate-300 px-2 py-2.5 text-base" />
                      </label>
                      <button className="rounded-xl bg-[#0f766e] px-5 py-3 text-base font-extrabold text-white active:brightness-95">Cumplir</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Reporte del turno (lo principal) */}
      <section className="rounded-2xl border-2 border-teal-300 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-base font-extrabold text-teal-800">✍️ Reporte del turno</h2>
        <p className="mb-3 text-xs text-slate-500">Turno, tipo, cuántos salieron por sabor y quiénes trabajaron.</p>
        <ProduccionForm saboresPorLinea={saboresProd} equipo={equipoTrato} yoId={yo?.sub} />
      </section>

      {/* Producido hoy (resumen) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">🧾 Producido hoy</h2>
          {totalHoy > 0 && <span className="text-xs font-semibold text-slate-400">{totalHoy} u.</span>}
        </div>
        {registroHoy.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no registras producción hoy.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {registroHoy.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-1.5">
                <span className="min-w-0">
                  <span className="font-bold text-teal-700">+{m.cantidad}</span>{" "}
                  <span className="text-slate-800">{m.nombre}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {m.nombreUsuario ? `${m.nombreUsuario} · ` : ""}{fmtHora(m.fecha)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] leading-tight text-slate-400">
          Solo ves lo del día. Los totales, costos y pagos se ven únicamente en el panel.
        </p>
      </section>
    </div>
  );
}
