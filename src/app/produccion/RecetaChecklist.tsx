"use client";

import { useMemo, useState } from "react";
import { fmtCant, unidadLabel } from "@/lib/dominio/materias";
import { confirmarMezcla } from "./actions";

type Item = { id: string; nombre: string; unidad: string; cantidad: number };
type Receta = { clase: "producto" | "sabor"; id: string; nombre: string; items: Item[] };

/**
 * Control de calidad por receta: eliges qué mezcla harás y cuántas unidades; se
 * muestra la receta como checklist. Marcas lo que echaste y, al confirmar, se
 * descuenta solo de la base de insumos (cantidad de la receta × unidades).
 */
export default function RecetaChecklist({ recetas }: { recetas: Receta[] }) {
  const [sel, setSel] = useState("");
  const [cantidad, setCantidad] = useState("");

  const receta = useMemo(() => recetas.find((r) => `${r.clase}:${r.id}` === sel) ?? null, [sel, recetas]);
  const n = Math.max(0, Number(cantidad.replace(/[^0-9]/g, "")) || 0);

  if (recetas.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
        No hay recetas cargadas. Pídele a la central que arme las recetas (Materias primas → Recetas).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800">
          <option value="">¿Qué mezcla harás?</option>
          {recetas.map((r) => (
            <option key={`${r.clase}:${r.id}`} value={`${r.clase}:${r.id}`}>
              {r.clase === "sabor" ? "🍫" : "📦"} {r.nombre}
            </option>
          ))}
        </select>
        <input
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          inputMode="numeric"
          placeholder="¿Cuántas?"
          className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800"
        />
      </div>

      {receta && n > 0 && (
        <form action={confirmarMezcla} className="rounded-xl border-2 border-teal-200 bg-white p-3">
          <input type="hidden" name="cantidad" value={n} />
          <input type="hidden" name="nombre" value={receta.nombre} />
          <input type="hidden" name="clase" value={receta.clase} />
          <input type="hidden" name="refId" value={receta.id} />
          <input type="hidden" name="total" value={receta.items.length} />
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-teal-700">
            Receta de {receta.nombre} · para {n} u. — marca lo que echaste
          </p>
          <ul className="space-y-1">
            {receta.items.map((it) => (
              <li key={it.id}>
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50">
                  <input type="checkbox" name="marcado" value={it.id} defaultChecked className="h-5 w-5 accent-[#0f766e]" />
                  <span className="flex-1 text-sm font-semibold text-slate-800">{it.nombre}</span>
                  <span className="text-sm font-bold text-teal-700">{fmtCant(it.cantidad * n, it.unidad)}</span>
                </label>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-400">
            Desmarca lo que NO echaste. Al confirmar se descuenta de los insumos solo lo marcado.
          </p>

          {/* Turno + operarios + observaciones */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-slate-600">Turno
              <select name="turno" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                <option value="">—</option>
                <option value="manana">Mañana</option>
                <option value="tarde">Tarde</option>
                <option value="noche">Noche</option>
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Operarios
              <input name="operarios" placeholder="Nombres" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
          </div>
          <label className="mt-2 block text-xs font-bold text-slate-600">Observaciones
            <textarea name="observaciones" rows={2} placeholder="Notas de calidad, incidencias…" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>

          <button className="mt-3 w-full rounded-xl bg-[#0f766e] py-3 text-base font-extrabold text-white active:brightness-95">
            ✓ Confirmar mezcla y descontar insumos
          </button>
        </form>
      )}

      {receta && n === 0 && (
        <p className="text-center text-xs text-slate-400">Escribe cuántas unidades harás para ver las cantidades.</p>
      )}
    </div>
  );
}
