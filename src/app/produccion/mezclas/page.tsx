import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { registrarAcceso } from "@/lib/dominio/accesos";
import { categoriaIcono, categoriaLabel } from "@/lib/dominio/materias";
import { registrarMezclas } from "../actions";

export const dynamic = "force-dynamic";

const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Registrar mezclas: el operario anota cuántas mezclas hizo y cuánto usó de cada
 * insumo (lo que pesó). Descuenta el stock y deja el consumo registrado para el
 * control de gasto/merma y el pronóstico de duración en el cerebro.
 */
export default async function ProduccionMezclas({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  await registrarAcceso("produccion", "Registrar mezclas");
  const { ok } = await searchParams;

  const [materiales, ultimos] = await Promise.all([
    prisma.materiaPrima.findMany({
      where: { activo: true },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, unidad: true, categoria: true },
    }),
    prisma.produccionMezcla.findMany({ orderBy: { fecha: "desc" }, take: 8 }),
  ]);

  const insumos = materiales.filter((m) => m.categoria === "insumo");
  const materls = materiales.filter((m) => m.categoria === "material");

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
        <h1 className="text-xl font-extrabold text-slate-900">🧪 Registrar mezclas</h1>
        <p className="text-xs text-slate-500">Anota cuántas mezclas hiciste y cuánto usaste de cada insumo. Descuenta el stock y el cerebro calcula el gasto y cuánto dura.</p>
      </div>

      {ok && <p className="rounded-xl bg-green-100 px-4 py-2.5 text-center text-sm font-bold text-green-700">✓ Mezclas registradas y stock descontado</p>}

      <form action={registrarMezclas} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-slate-600">N° de mezclas
            <input name="mezclas" inputMode="numeric" defaultValue="1" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#b45309]" />
          </label>
          <label className="text-xs font-bold text-slate-600">Tipo de mezcla
            <input name="tipo" list="tipos-mezcla" defaultValue="base" placeholder="base / trufa / postre…" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#b45309]" />
            <datalist id="tipos-mezcla"><option value="base" /><option value="trufa" /><option value="postre" /><option value="paleta de leche" /><option value="paleta de agua" /></datalist>
          </label>
        </div>

        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{categoriaIcono.insumo} {categoriaLabel.insumo ?? "Insumos"} usados</p>
          <div className="space-y-1.5">
            {insumos.length === 0
              ? <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">No hay insumos. Créalos en Bodega → Insumos.</p>
              : insumos.map(Campo)}
          </div>
        </div>

        {materls.length > 0 && (
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{categoriaIcono.material} {categoriaLabel.material ?? "Materiales"} usados</p>
            <div className="space-y-1.5">{materls.map(Campo)}</div>
          </div>
        )}

        <label className="block text-xs font-bold text-slate-600">Nota (opcional)
          <input name="nota" placeholder="Ej: salió espesa / probamos menos azúcar" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#b45309]" />
        </label>

        <button className="w-full rounded-xl bg-[#b45309] py-3 text-base font-extrabold text-white shadow active:brightness-95">
          💾 Registrar mezclas y descontar
        </button>
      </form>

      {ultimos.length > 0 && (
        <div>
          <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Últimas mezclas</h2>
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
        <Link href="/produccion/insumos" className="text-sm font-semibold text-[#b45309]">Ver insumos disponibles →</Link>
      </div>
    </div>
  );
}
