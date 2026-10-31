import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { registrarAcceso } from "@/lib/dominio/accesos";
import { categoriaIcono, categoriaLabel, fmtCant, promedioPorMezcla } from "@/lib/dominio/materias";
import { registrarMezclas } from "../actions";

export const dynamic = "force-dynamic";

const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Registrar BALDES / MEZCLAS: el operario anota cuántos baldes/mezclas hizo y de qué
 * sabor. Opcionalmente anota cuánto usó de cada insumo. El cerebro aprende el consumo
 * por mezcla y estima lo que debió ocuparse.
 */
export default async function ProduccionMezclas({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await registrarAcceso("produccion", "Registrar mezclas");
  const { ok } = await searchParams;

  const [materiales, ultimos, sabores, consumoAll, mezclasAgg] = await Promise.all([
    prisma.materiaPrima.findMany({
      where: { activo: true },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, unidad: true, categoria: true },
    }),
    prisma.produccionMezcla.findMany({ orderBy: { fecha: "desc" }, take: 8 }),
    prisma.sabor.findMany({ where: { activo: true }, select: { nombre: true }, orderBy: { nombre: "asc" } }),
    prisma.movimientoMateria.groupBy({ by: ["materiaPrimaId"], where: { tipo: "consumo" }, _sum: { cantidad: true } }),
    prisma.produccionMezcla.aggregate({ _sum: { mezclas: true } }),
  ]);

  const insumos = materiales.filter((m) => m.categoria === "insumo");
  const materls = materiales.filter((m) => m.categoria === "material");

  // Consumo aprendido por mezcla (promedio histórico): cuánto usa cada insumo por mezcla.
  const consumoDe = new Map(consumoAll.map((c) => [c.materiaPrimaId, Math.abs(Number(c._sum.cantidad ?? 0))]));
  const mezclasTot = Number(mezclasAgg._sum.mezclas ?? 0);
  const aprendido = materiales
    .map((m) => ({ ...m, porMezcla: promedioPorMezcla(consumoDe.get(m.id) ?? 0, mezclasTot) }))
    .filter((m) => m.porMezcla != null && m.porMezcla > 0);

  const Campo = (m: { id: string; nombre: string; unidad: string }) => (
    <label key={m.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <span className="min-w-0 truncate text-sm font-semibold text-slate-700">{m.nombre}</span>
      <span className="flex shrink-0 items-center gap-1">
        <input name={`uso_${m.id}`} inputMode="decimal" placeholder="0" className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-[#b45309]" />
        <span className="w-8 text-xs text-slate-400">{m.unidad}</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🧪 Registrar baldes / mezclas</h1>
        <p className="text-xs text-slate-500">Anota cuántos baldes/mezclas hiciste y de qué sabor. Los insumos son opcionales; el cerebro aprende y estima el consumo.</p>
      </div>

      {ok && <p className="rounded-xl bg-green-100 px-4 py-2.5 text-center text-sm font-bold text-green-700">✓ Registrado</p>}

      <form action={registrarMezclas} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-slate-600">N° de baldes / mezclas
            <input name="mezclas" inputMode="numeric" defaultValue="1" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#b45309]" />
          </label>
          <label className="text-xs font-bold text-slate-600">Sabor / tipo
            <input name="tipo" list="sabores-list" defaultValue="" placeholder="Ej: frutilla, chocolate…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#b45309]" />
            <datalist id="sabores-list">
              {sabores.map((s) => <option key={s.nombre} value={s.nombre} />)}
              <option value="base" /><option value="trufa" /><option value="postre" />
            </datalist>
          </label>
        </div>

        <label className="block text-xs font-bold text-slate-600">Nota (opcional)
          <input name="nota" placeholder="Ej: salió espesa / probamos menos azúcar" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#b45309]" />
        </label>

        {/* Insumos usados — OPCIONAL (retráctil) */}
        <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-extrabold text-slate-700">➕ Anotar insumos usados (opcional)</summary>
          <div className="space-y-3 border-t border-slate-100 p-3">
            {insumos.length === 0 ? (
              <p className="text-xs text-slate-500">No hay insumos. Créalos en Bodega → Insumos.</p>
            ) : (
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{categoriaIcono.insumo} {categoriaLabel.insumo}</p>
                <div className="space-y-1.5">{insumos.map(Campo)}</div>
              </div>
            )}
            {materls.length > 0 && (
              <div>
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{categoriaIcono.material} {categoriaLabel.material}</p>
                <div className="space-y-1.5">{materls.map(Campo)}</div>
              </div>
            )}
          </div>
        </details>

        <button className="w-full rounded-xl bg-[#b45309] py-3 text-base font-extrabold text-white shadow active:brightness-95">
          💾 Registrar baldes / mezclas
        </button>
      </form>

      {/* Consumo aprendido (lo que debió ocuparse por mezcla) */}
      {aprendido.length > 0 && (
        <details className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-extrabold text-slate-700">📊 Cada mezcla usa (aprendido)</summary>
          <ul className="space-y-1 border-t border-slate-100 p-3 text-sm">
            {aprendido.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <span className="text-slate-700">{m.nombre}</span>
                <span className="font-bold text-slate-900">~{fmtCant(Number(m.porMezcla!.toFixed(2)), m.unidad)}/mezcla</span>
              </li>
            ))}
          </ul>
          <p className="px-3 pb-3 text-[11px] text-slate-400">Promedio aprendido de {mezclasTot} mezclas. El cerebro lo usa para estimar lo que debió ocuparse.</p>
        </details>
      )}

      {ultimos.length > 0 && (
        <div>
          <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Últimos registros</h2>
          <ul className="space-y-1 text-sm">
            {ultimos.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 shadow-sm">
                <span className="font-semibold text-slate-700">{r.mezclas}× {r.tipo}</span>
                <span className="text-xs text-slate-400">{r.nombreUsuario ? `${r.nombreUsuario} · ` : ""}{fmtDia(r.fecha)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-center">
        <Link href="/produccion/insumos" className="text-sm font-semibold text-[#b45309]">Ver insumos →</Link>
      </div>
    </div>
  );
}
