import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCant, unidadLabel, categoriaIcono } from "@/lib/dominio/materias";
import { agregarRecetaItem, quitarRecetaItem } from "../actions";

export const dynamic = "force-dynamic";

export default async function RecetasPage({
  searchParams,
}: {
  searchParams: Promise<{ producto?: string; sabor?: string }>;
}) {
  const { producto, sabor } = await searchParams;

  const [productos, sabores, materiales] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }], select: { id: true, nombre: true, linea: true } }),
    prisma.materiaPrima.findMany({ where: { activo: true }, orderBy: [{ categoria: "asc" }, { nombre: "asc" }], select: { id: true, nombre: true, unidad: true, categoria: true } }),
  ]);

  const target = producto ? { clase: "producto" as const, id: producto } : sabor ? { clase: "sabor" as const, id: sabor } : null;
  const targetNombre = producto
    ? productos.find((p) => p.id === producto)?.nombre
    : sabor
      ? sabores.find((s) => s.id === sabor)?.nombre
      : null;
  const volver = producto ? `producto=${producto}` : sabor ? `sabor=${sabor}` : "";

  const receta = target
    ? await prisma.recetaItem.findMany({
        where: target.clase === "producto" ? { productoId: target.id } : { saborId: target.id },
        include: { materiaPrima: { select: { nombre: true, unidad: true, costo: true } } },
      })
    : [];

  const costoUnidad = receta.reduce((s, r) => s + (r.materiaPrima.costo != null ? Number(r.materiaPrima.costo) * r.cantidad : 0), 0);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin/materias" className="text-sm font-semibold text-[#1479c4]">← Materias primas</Link>
      <h1 className="mt-1 text-2xl font-extrabold text-slate-900">📋 Recetas (lista de materiales)</h1>
      <p className="text-sm text-slate-500">
        Define cuánto insumo lleva <b>una unidad</b>. Al fabricar, se descuenta solo (cantidad × unidades producidas).
      </p>

      {/* Elegir producto o sabor */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <form action="/admin/materias/recetas" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Receta de un producto</label>
          <div className="mt-1 flex gap-2">
            <select name="producto" defaultValue={producto ?? ""} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="">— elegir —</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <button className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Ver</button>
          </div>
        </form>
        <form action="/admin/materias/recetas" className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Receta de un sabor</label>
          <div className="mt-1 flex gap-2">
            <select name="sabor" defaultValue={sabor ?? ""} className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="">— elegir —</option>
              {sabores.map((s) => <option key={s.id} value={s.id}>{s.nombre} ({s.linea})</option>)}
            </select>
            <button className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white">Ver</button>
          </div>
        </form>
      </div>

      {!target ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Elige un producto o un sabor para editar su receta.
        </p>
      ) : (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Receta de: {targetNombre}</h2>
            {costoUnidad > 0 && (
              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                Costo insumos / u.: ${Math.round(costoUnidad).toLocaleString("es-CL")}
              </span>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {receta.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
                Sin insumos en la receta. Agrégalos abajo. (Sin receta, el consumo se hace a mano.)
              </p>
            )}
            {receta.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <span className="min-w-0 truncate text-sm">
                  <b className="text-slate-900">{fmtCant(r.cantidad, r.materiaPrima.unidad)}</b>{" "}
                  <span className="text-slate-600">de {r.materiaPrima.nombre}</span>
                  <span className="text-xs text-slate-400"> · por unidad</span>
                </span>
                <form action={quitarRecetaItem}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="volver" value={volver} />
                  <button className="shrink-0 text-xs font-semibold text-red-500">Quitar</button>
                </form>
              </div>
            ))}
          </div>

          {/* Agregar insumo a la receta */}
          <form action={agregarRecetaItem} className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            {target.clase === "producto"
              ? <input type="hidden" name="productoId" value={target.id} />
              : <input type="hidden" name="saborId" value={target.id} />}
            <label className="min-w-[10rem] flex-1 text-xs font-semibold text-slate-500">
              Insumo
              <select name="materiaPrimaId" required className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                <option value="">— elegir insumo —</option>
                {materiales.map((mm) => (
                  <option key={mm.id} value={mm.id}>{categoriaIcono[mm.categoria]} {mm.nombre} ({unidadLabel[mm.unidad] ?? mm.unidad})</option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Cantidad por unidad
              <input name="cantidad" inputMode="decimal" required placeholder="ej: 8" className="mt-0.5 w-28 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
            <button className="rounded-lg bg-[#1479c4] px-4 py-2 text-sm font-extrabold text-white active:brightness-110">Agregar</button>
          </form>
        </div>
      )}
    </div>
  );
}
