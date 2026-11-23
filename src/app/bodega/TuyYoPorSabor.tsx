"use client";

import { useState } from "react";
import { apartarTuyYoSabor } from "./actions";

type Fila = { key: number; sabor: string; bolsas: string };

/**
 * Apartar Tú y Yo por sabor (texto libre): el bodeguero escribe el sabor y
 * cuántas bolsas de 50. Descuenta del Tú y Yo Surtido y deja el registro.
 */
export default function TuyYoPorSabor() {
  const [filas, setFilas] = useState<Fila[]>([{ key: 1, sabor: "", bolsas: "" }]);

  const set = (key: number, patch: Partial<Fila>) => setFilas((f) => f.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const add = () => setFilas((f) => [...f, { key: Date.now(), sabor: "", bolsas: "" }]);
  const del = (key: number) => setFilas((f) => (f.length > 1 ? f.filter((x) => x.key !== key) : f));

  const items = filas
    .map((f) => ({ sabor: f.sabor.trim(), bolsas: Number((f.bolsas || "").replace(/[^\d]/g, "")) || 0 }))
    .filter((f) => f.sabor && f.bolsas > 0);
  const totalU = items.reduce((s, f) => s + f.bolsas * 50, 0);

  return (
    <form action={apartarTuyYoSabor} className="space-y-2">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      {filas.map((f) => (
        <div key={f.key} className="flex items-center gap-2">
          <input value={f.sabor} onChange={(e) => set(f.key, { sabor: e.target.value })} placeholder="Sabor (ej: frutilla)"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={f.bolsas} onChange={(e) => set(f.key, { bolsas: e.target.value })} inputMode="numeric" placeholder="bolsas"
            className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-right text-sm font-semibold" />
          <span className="shrink-0 text-[11px] text-slate-400">×50</span>
          <button type="button" onClick={() => del(f.key)} aria-label="Quitar" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-red-500 active:bg-red-50">✕</button>
        </div>
      ))}
      <button type="button" onClick={add} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 active:bg-slate-200">+ Otro sabor</button>
      {items.length > 0 && (
        <button className="w-full rounded-xl bg-[#b45309] py-2.5 text-sm font-extrabold text-white active:brightness-95">
          Apartar {items.length} sabor{items.length > 1 ? "es" : ""} · {totalU} u.
        </button>
      )}
      <p className="text-[11px] text-slate-400">Descuenta del “Tú y Yo Surtido” y queda registrado con el sabor.</p>
    </form>
  );
}
