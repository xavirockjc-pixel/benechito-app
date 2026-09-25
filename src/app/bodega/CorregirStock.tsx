"use client";

import { useMemo, useState } from "react";
import { fijarStockConteo } from "./actions";

type Item = { id: string; nombre: string; actual: number; grupo: "Productos" | "Sabores" };

/**
 * Conteo / corrección de stock: se escribe cuántos HAY de verdad y el sistema deja
 * ese número (no suma ni resta ventas). Sirve mientras no hay un orden fijo de
 * entradas/salidas: se corrobora y se edita directo. Solo guarda lo que cambió y
 * SIEMPRE deja el ajuste registrado para poder comparar después. `zona` = dónde
 * se cuenta (bodega o sala/local).
 */
export default function CorregirStock({ items, zona = "bodega" }: { items: Item[]; zona?: "bodega" | "sala" }) {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  const val = (it: Item) => (valores[it.id] ?? String(it.actual));
  const set = (id: string, v: string) => setValores((s) => ({ ...s, [id]: v.replace(/[^0-9]/g, "") }));

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const filtrados = useMemo(
    () => (q.trim() ? items.filter((it) => norm(it.nombre).includes(norm(q.trim()))) : items),
    [items, q],
  );

  // Solo enviamos lo que el usuario cambió respecto al valor actual.
  const cambios = items
    .filter((it) => valores[it.id] !== undefined && Number(valores[it.id] || 0) !== it.actual)
    .map((it) => ({ id: it.id, cantidad: Number(valores[it.id] || 0) }));

  const grupos = ["Productos", "Sabores"] as const;

  return (
    <details className="rounded-2xl border border-blue-200 bg-blue-50/40 p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-extrabold text-blue-800">
        ✏️ Corregir el stock real (conteo)
      </summary>
      <p className="mt-1 text-xs text-slate-500">
        Escribe cuántos hay de verdad y el sistema lo deja en ese número. No pasa por ventas ni entradas: es para corroborar y ordenar los números.
      </p>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar producto o sabor…"
        className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500"
      />

      <form action={fijarStockConteo} className="mt-3">
        <input type="hidden" name="zona" value={zona} />
        <input type="hidden" name="items" value={JSON.stringify(cambios)} />

        {grupos.map((g) => {
          const rows = filtrados.filter((it) => it.grupo === g);
          if (rows.length === 0) return null;
          return (
            <div key={g} className="mt-3">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{g}</p>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {rows.map((it) => {
                  const cambiado = valores[it.id] !== undefined && Number(valores[it.id] || 0) !== it.actual;
                  return (
                    <li key={it.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0 truncate text-sm font-semibold text-slate-800">
                        {it.nombre}
                        <span className="ml-1 text-xs font-normal text-slate-400">(hay {it.actual})</span>
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        inputMode="numeric"
                        value={val(it)}
                        onChange={(e) => set(it.id, e.target.value)}
                        className={`w-20 shrink-0 rounded-lg border px-2 py-1.5 text-right text-base font-bold outline-none ${cambiado ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-300 text-slate-900"}`}
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}

        <button
          disabled={cambios.length === 0}
          className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40"
        >
          {cambios.length > 0 ? `Guardar conteo (${cambios.length} cambio${cambios.length > 1 ? "s" : ""})` : "Sin cambios"}
        </button>
      </form>
    </details>
  );
}
