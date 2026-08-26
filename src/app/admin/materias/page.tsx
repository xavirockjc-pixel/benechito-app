import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  CATEGORIAS, UNIDADES, categoriaLabel, categoriaIcono, unidadLabel, fmtCant, tipoMovMateriaLabel, stockBajo,
} from "@/lib/dominio/materias";
import MateriaRow from "./MateriaRow";
import { crearMateria } from "./actions";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function MateriasCentral() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const en30dias = new Date();
  en30dias.setDate(en30dias.getDate() + 30);

  const [materiales, movs, mermasMes, porVencer] = await Promise.all([
    prisma.materiaPrima.findMany({ where: { activo: true }, orderBy: [{ categoria: "asc" }, { nombre: "asc" }] }),
    prisma.movimientoMateria.findMany({
      orderBy: { fecha: "desc" }, take: 40,
      include: { materiaPrima: { select: { nombre: true, unidad: true } } },
    }),
    prisma.movimientoMateria.findMany({
      where: { tipo: "merma", fecha: { gte: inicioMes } },
      include: { materiaPrima: { select: { nombre: true, unidad: true, costo: true } } },
      orderBy: { fecha: "desc" },
    }),
    prisma.movimientoMateria.findMany({
      where: { tipo: "entrada", vence: { not: null, lte: en30dias } },
      include: { materiaPrima: { select: { nombre: true, unidad: true } } },
      orderBy: { vence: "asc" }, take: 30,
    }),
  ]);

  const mats = materiales.map((m) => ({
    id: m.id, nombre: m.nombre, categoria: m.categoria, unidad: m.unidad,
    stock: m.stock, stockMinimo: m.stockMinimo, costo: m.costo != null ? Number(m.costo) : null,
  }));
  const valorTotal = mats.reduce((s, m) => s + (m.costo != null ? m.stock * m.costo : 0), 0);
  const bajos = mats.filter((m) => stockBajo(m.stock, m.stockMinimo));
  const porCat = (cat: string) => mats.filter((m) => m.categoria === cat);

  // Pérdida por mermas del mes (para ajustar costos reales).
  const perdidaMermas = mermasMes.reduce(
    (s, mv) => s + (mv.materiaPrima.costo != null ? Math.abs(mv.cantidad) * Number(mv.materiaPrima.costo) : 0),
    0,
  );

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-extrabold text-slate-900">🧪 Materias primas y materiales</h1>
        <Link href="/admin/materias/recetas" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white active:brightness-110">
          📋 Recetas
        </Link>
      </div>
      <p className="text-sm text-slate-500">Existencias que se descuentan al fabricar. El total y los costos solo se ven aquí.</p>

      {/* Resumen */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Kpi label="Insumos" valor={String(mats.length)} />
        <Kpi label="Valor inventario" valor={`$${Math.round(valorTotal).toLocaleString("es-CL")}`} />
        <Kpi label="Bajo mínimo" valor={String(bajos.length)} alerta={bajos.length > 0} />
      </div>

      {bajos.length > 0 && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          ⚠️ <b>Reponer pronto:</b>
          <ul className="mt-1 space-y-0.5">
            {bajos.map((m) => {
              const falta = Math.max(0, m.stockMinimo - m.stock);
              return (
                <li key={m.id} className="flex justify-between">
                  <span>{m.nombre} <span className="text-red-500">· quedan {fmtCant(m.stock, m.unidad)}</span></span>
                  {falta > 0 && <span className="font-bold">faltan {fmtCant(falta, m.unidad)}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Alertas de vencimiento (trazabilidad en alimentos) */}
      {porVencer.length > 0 && (
        <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
          ⏳ <b>Por vencer / vencidos:</b>
          <ul className="mt-1 space-y-0.5">
            {porVencer.map((mv) => {
              const dias = Math.ceil((new Date(mv.vence!).getTime() - Date.now()) / 86400000);
              return (
                <li key={mv.id} className="flex justify-between">
                  <span>
                    {mv.materiaPrima.nombre}
                    {mv.lote ? <span className="text-orange-600"> · lote {mv.lote}</span> : ""}
                  </span>
                  <span className={`font-bold ${dias < 0 ? "text-red-600" : ""}`}>
                    {dias < 0 ? `vencido hace ${-dias}d` : dias === 0 ? "vence hoy" : `en ${dias}d`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Mermas del mes (ajuste de costos reales) */}
      {mermasMes.length > 0 && (
        <details className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <summary className="flex cursor-pointer items-center justify-between font-bold">
            <span>🗑️ Mermas del mes ({mermasMes.length})</span>
            {perdidaMermas > 0 && <span>−${Math.round(perdidaMermas).toLocaleString("es-CL")} en pérdidas</span>}
          </summary>
          <ul className="mt-2 space-y-1">
            {mermasMes.slice(0, 25).map((mv) => (
              <li key={mv.id} className="flex items-center justify-between border-t border-amber-100 pt-1">
                <span className="min-w-0 truncate">
                  <b>{fmtCant(Math.abs(mv.cantidad), mv.materiaPrima.unidad)}</b> {mv.materiaPrima.nombre}
                  {mv.motivo ? <span className="text-amber-600"> · {mv.motivo}</span> : ""}
                </span>
                <span className="shrink-0 text-xs text-amber-600">
                  {mv.materiaPrima.costo != null ? `−$${Math.round(Math.abs(mv.cantidad) * Number(mv.materiaPrima.costo)).toLocaleString("es-CL")}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-amber-600">La pérdida se calcula con el costo cargado de cada insumo. Registra las mermas con su motivo desde cada insumo (➖ Merma).</p>
        </details>
      )}

      {/* Crear insumo */}
      <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-bold text-slate-700">➕ Nuevo insumo</summary>
        <form action={crearMateria} className="mt-3 grid grid-cols-2 gap-2">
          <input name="nombre" required placeholder="Nombre (ej: Chocolate cobertura)" className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <label className="text-xs font-semibold text-slate-500">Tipo
            <select name="categoria" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
              {CATEGORIAS.map((c) => <option key={c} value={c}>{categoriaLabel[c]}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">Unidad
            <select name="unidad" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
              {UNIDADES.map((u) => <option key={u} value={u}>{unidadLabel[u]}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">Stock inicial
            <input name="stockInicial" inputMode="decimal" placeholder="0" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <label className="text-xs font-semibold text-slate-500">Costo / unidad
            <input name="costo" inputMode="decimal" placeholder="0" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <label className="col-span-2 text-xs font-semibold text-slate-500">Mínimo para alerta
            <input name="stockMinimo" inputMode="decimal" placeholder="0" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <button className="col-span-2 rounded-lg bg-[#1479c4] py-2.5 text-sm font-extrabold text-white active:brightness-110">Crear insumo</button>
        </form>
      </details>

      {/* Listado por categoría */}
      {CATEGORIAS.map((cat) => {
        const lista = porCat(cat);
        if (lista.length === 0) return null;
        return (
          <div key={cat} className="mt-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              {categoriaIcono[cat]} {categoriaLabel[cat]} ({lista.length})
            </h2>
            <div className="space-y-2">
              {lista.map((m) => <MateriaRow key={m.id} m={m} />)}
            </div>
          </div>
        );
      })}

      {mats.length === 0 && (
        <p className="mt-5 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Aún no hay insumos. Créalos con “➕ Nuevo insumo”.
        </p>
      )}

      {/* Movimientos */}
      <h2 className="mb-2 mt-7 text-sm font-bold uppercase tracking-wide text-slate-500">Últimos movimientos</h2>
      {movs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Sin movimientos.</p>
      ) : (
        <ul className="space-y-1">
          {movs.map((m) => {
            const entra = m.tipo === "entrada" || (m.tipo === "ajuste" && m.cantidad >= 0);
            return (
              <li key={m.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                <span className="min-w-0 truncate">
                  <span className={`font-bold ${entra ? "text-green-600" : "text-amber-600"}`}>
                    {entra ? "+" : "−"}{fmtCant(Math.abs(m.cantidad), m.materiaPrima.unidad)}
                  </span>{" "}
                  <span className="text-slate-800">{m.materiaPrima.nombre}</span>{" "}
                  <span className="text-xs text-slate-400">· {tipoMovMateriaLabel[m.tipo] ?? m.tipo}{m.motivo ? ` · ${m.motivo}` : ""}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">{m.nombreUsuario ? `${m.nombreUsuario} · ` : ""}{fmtHora(m.fecha)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, valor, alerta }: { label: string; valor: string; alerta?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alerta ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}>
      <p className={`text-lg font-extrabold ${alerta ? "text-red-600" : "text-slate-900"}`}>{valor}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
