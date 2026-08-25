"use client";

import { useState } from "react";
import { LINEAS_PRODUCCION, lineaLabel } from "@/lib/dominio/produccion";
import { registrarProduccion } from "./actions";

type Fila = { key: number; nombre: string; cantidad: string };

/**
 * Anota lo que se produjo: eliges el TIPO y agregas líneas "sabor + cuántos".
 * Sin listado de sabores: se escribe el sabor y el sistema lo crea si no existe.
 */
export default function ProduccionForm() {
  const [linea, setLinea] = useState<string>(LINEAS_PRODUCCION[0]);
  const [filas, setFilas] = useState<Fila[]>([{ key: 1, nombre: "", cantidad: "" }]);

  const setFila = (key: number, patch: Partial<Fila>) => setFilas((f) => f.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const addFila = () => setFilas((f) => [...f, { key: Date.now() + f.length, nombre: "", cantidad: "" }]);
  const delFila = (key: number) => setFilas((f) => (f.length > 1 ? f.filter((x) => x.key !== key) : f));

  const items = filas
    .map((f) => ({ nombre: f.nombre.trim(), cantidad: Number(f.cantidad.replace(/[^0-9]/g, "")) || 0 }))
    .filter((i) => i.nombre && i.cantidad > 0);
  const total = items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <form action={registrarProduccion} className="space-y-3">
      <input type="hidden" name="linea" value={linea} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <label className="block text-sm font-bold text-slate-700">Tipo de producto
        <select value={linea} onChange={(e) => setLinea(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#0f766e]">
          {LINEAS_PRODUCCION.map((l) => <option key={l} value={l}>{lineaLabel[l] ?? l}</option>)}
        </select>
      </label>

      <div className="space-y-2">
        {filas.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <input value={f.nombre} onChange={(e) => setFila(f.key, { nombre: e.target.value })} placeholder="Sabor (ej: frutilla)"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800" />
            <input value={f.cantidad} onChange={(e) => setFila(f.key, { cantidad: e.target.value })} inputMode="numeric" placeholder="Cant."
              className="w-20 rounded-lg border border-slate-300 px-2 py-2.5 text-right text-sm font-semibold" />
            <button type="button" onClick={() => delFila(f.key)} className="shrink-0 text-xs font-bold text-red-500">✕</button>
          </div>
        ))}
      </div>

      <button type="button" onClick={addFila} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 active:bg-slate-200">
        + Otro sabor
      </button>

      <button disabled={total === 0}
        className="w-full rounded-xl bg-[#0f766e] py-3 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40">
        Registrar producción {total > 0 ? `(${total} u.)` : ""}
      </button>
    </form>
  );
}
