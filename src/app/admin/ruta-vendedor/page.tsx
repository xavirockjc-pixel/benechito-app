import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { RUTAS, rutaDeComuna } from "@/lib/dominio/sectores";

export const dynamic = "force-dynamic";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/**
 * Analítica de la ruta del vendedor (hoy): según la ruta establecida para este día,
 * muestra por cuántos lugares pasó, cuáles COMPRARON, cuáles solo visitó y cuáles
 * OMITIÓ. Reemplaza el "dónde está" por un control real del recorrido.
 */
export default async function RutaVendedorPage({ searchParams }: { searchParams: Promise<{ ruta?: string }> }) {
  const sp = await searchParams;
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const diaHoy = ahora.getDay();

  const [agenda, negocios, ventasHoy, actsHoy] = await Promise.all([
    prisma.rutaDia.findMany(),
    prisma.negocio.findMany({
      where: { nombreNegocio: { not: "Consumidor Final" }, estado: { not: "inactivo" } },
      select: { id: true, nombreNegocio: true, comuna: true, sector: true },
      take: 3000,
    }),
    prisma.venta.findMany({ where: { fecha: { gte: inicioHoy } }, select: { negocioId: true }, distinct: ["negocioId"] }),
    prisma.actividad.findMany({ where: { createdAt: { gte: inicioHoy } }, select: { negocioId: true }, distinct: ["negocioId"] }),
  ]);

  const compro = new Set(ventasHoy.map((v) => v.negocioId));
  const visitó = new Set(actsHoy.map((a) => a.negocioId));
  const diaDe = new Map(agenda.map((a) => [a.ruta, a.dia]));

  // Rutas a mostrar: la(s) de hoy (según agenda), o la elegida en el selector.
  const rutasHoy = RUTAS.filter((r) => diaDe.get(r.clave) === diaHoy);
  const mostrar = sp.ruta ? RUTAS.filter((r) => r.clave === sp.ruta) : (rutasHoy.length ? rutasHoy : []);

  // Clasifica los clientes de una ruta.
  const analizar = (claveRuta: string) => {
    const clientes = negocios.filter((n) => rutaDeComuna(n.sector || n.comuna).clave === claveRuta);
    const compraron = clientes.filter((c) => compro.has(c.id));
    const soloVisita = clientes.filter((c) => !compro.has(c.id) && visitó.has(c.id));
    const omitidos = clientes.filter((c) => !compro.has(c.id) && !visitó.has(c.id));
    return { total: clientes.length, compraron, soloVisita, omitidos };
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/resumen" className="text-sm font-semibold text-[#1479c4]">← Resumen</Link>
      <h1 className="mt-1 text-2xl font-extrabold text-slate-900">🚚 Ruta del vendedor · hoy</h1>
      <p className="text-sm text-slate-500">{DIAS[diaHoy]}. Qué clientes de la ruta compraron, cuáles se visitaron y cuáles quedaron sin pasar.</p>

      {/* Selector de ruta */}
      <form className="mt-3">
        <select name="ruta" defaultValue={sp.ruta ?? ""} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
          <option value="">Ruta(s) de hoy ({rutasHoy.length ? rutasHoy.map((r) => r.label).join(", ") : "ninguna asignada"})</option>
          {RUTAS.map((r) => <option key={r.clave} value={r.clave}>📍 {r.label}{diaDe.has(r.clave) ? ` · ${DIAS[diaDe.get(r.clave)!]}` : ""}</option>)}
        </select>
        <button className="mt-2 w-full rounded-lg bg-slate-900 py-2 text-sm font-bold text-white">Ver ruta</button>
      </form>

      {mostrar.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No hay ruta asignada para hoy. Elige una arriba, o asigna los días en la app vendedor → Preventa por ruta.
        </p>
      ) : (
        <div className="mt-4 space-y-5">
          {mostrar.map((r) => {
            const a = analizar(r.clave);
            const pct = a.total > 0 ? Math.round(((a.compraron.length + a.soloVisita.length) / a.total) * 100) : 0;
            return (
              <section key={r.clave} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-slate-900">📍 {r.label}</h2>
                  <span className="text-xs font-semibold text-slate-400">{a.total} clientes · {pct}% cubierto</span>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-green-50 p-2"><p className="text-xl font-extrabold text-green-700">{a.compraron.length}</p><p className="text-[11px] font-bold text-green-700">compraron</p></div>
                  <div className="rounded-xl bg-sky-50 p-2"><p className="text-xl font-extrabold text-sky-700">{a.soloVisita.length}</p><p className="text-[11px] font-bold text-sky-700">visitados</p></div>
                  <div className="rounded-xl bg-rose-50 p-2"><p className="text-xl font-extrabold text-rose-600">{a.omitidos.length}</p><p className="text-[11px] font-bold text-rose-600">omitidos</p></div>
                </div>

                {a.omitidos.length > 0 && (
                  <details className="mt-3 rounded-xl border border-rose-200 bg-rose-50">
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm font-extrabold text-rose-700">🚫 Omitidos ({a.omitidos.length}) — no se pasó</summary>
                    <ul className="space-y-0.5 border-t border-rose-100 p-2 text-sm">
                      {a.omitidos.map((c) => <li key={c.id} className="truncate text-slate-700">{c.nombreNegocio} <span className="text-[11px] text-slate-400">· {c.comuna}</span></li>)}
                    </ul>
                  </details>
                )}
                {a.compraron.length > 0 && (
                  <details className="mt-2 rounded-xl border border-green-200 bg-green-50">
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm font-extrabold text-green-700">✅ Compraron ({a.compraron.length})</summary>
                    <ul className="space-y-0.5 border-t border-green-100 p-2 text-sm">
                      {a.compraron.map((c) => <li key={c.id} className="truncate text-slate-700">{c.nombreNegocio}</li>)}
                    </ul>
                  </details>
                )}
                {a.soloVisita.length > 0 && (
                  <details className="mt-2 rounded-xl border border-sky-200 bg-sky-50">
                    <summary className="cursor-pointer list-none px-3 py-2 text-sm font-extrabold text-sky-700">👋 Visitados sin compra ({a.soloVisita.length})</summary>
                    <ul className="space-y-0.5 border-t border-sky-100 p-2 text-sm">
                      {a.soloVisita.map((c) => <li key={c.id} className="truncate text-slate-700">{c.nombreNegocio}</li>)}
                    </ul>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
