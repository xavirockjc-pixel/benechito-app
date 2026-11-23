"use client";

import { useState } from "react";
import { fijarStockConteo } from "./actions";

type Item = { id: string; nombre: string; cantidad: number; grupo: "Productos" | "Sabores" };

/** Icono (dibujito) según el producto, estilo Producción. */
function iconoProducto(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes("tú y yo") || n.includes("tu y yo") || n.includes("tuyyo")) return "🍦";
  if (n.includes("paleta") && n.includes("agua")) return "🧊";
  if (n.includes("paleta")) return "🍡";
  if (n.includes("postre")) return "🍨";
  if (n.includes("copa") || n.includes("garza") || n.includes("vaso")) return "🥤";
  if (n.includes("balde") || n.includes("litro")) return "🪣";
  if (n.includes("trufa")) return "🍫";
  if (n.includes("cuchufl")) return "🥐";
  return "📦";
}

/**
 * Stock actual EDITABLE: el bodeguero ve lo que hay y lo corrige ahí mismo —
 * toca el número y lo cambia, o "0" de un toque para dejarlo en cero (y que
 * desaparezca). Guarda solo lo que cambió (deja el ajuste registrado).
 */
export default function StockActualFix({ items }: { items: Item[] }) {
  const [val, setVal] = useState<Record<string, string>>({});

  const v = (it: Item) => val[it.id] ?? String(it.cantidad);
  const set = (id: string, s: string) => setVal((p) => ({ ...p, [id]: s.replace(/[^0-9]/g, "") }));

  const cambios = items
    .filter((it) => val[it.id] !== undefined && Number(val[it.id] || 0) !== it.cantidad)
    .map((it) => ({ id: it.id, cantidad: Number(val[it.id] || 0) }));

  const grupos = ["Productos", "Sabores"] as const;

  return (
    <form action={fijarStockConteo}>
      <input type="hidden" name="zona" value="bodega" />
      <input type="hidden" name="items" value={JSON.stringify(cambios)} />
      <p className="mb-1 text-[11px] text-slate-400">✏️ Toca el número y escribe lo que hay de verdad: queda como <b>corrección</b> (no es merma).</p>

      {grupos.map((g) => {
        const rows = items.filter((it) => it.grupo === g);
        if (rows.length === 0) return null;
        return (
          <div key={g} className="mt-1">
            {grupos.filter((x) => items.some((it) => it.grupo === x)).length > 1 && (
              <p className="mb-1 mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">{g}</p>
            )}
            <ul className="divide-y divide-slate-100">
              {rows.map((it) => {
                const cambiado = val[it.id] !== undefined && Number(val[it.id] || 0) !== it.cantidad;
                return (
                  <li key={it.id} className="flex items-center justify-between gap-2 py-2">
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-800">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-lg">{iconoProducto(it.nombre)}</span>
                      <span className="min-w-0 truncate">{it.nombre}</span>
                    </span>
                    <input
                      type="number" min="0" step="1" inputMode="numeric"
                      value={v(it)}
                      onChange={(e) => set(it.id, e.target.value)}
                      className={`w-16 shrink-0 rounded-lg border px-2 py-1.5 text-right text-base font-bold outline-none ${cambiado ? "border-[#b45309] bg-amber-50 text-[#b45309]" : "border-slate-200 text-slate-900"}`}
                    />
                    <button
                      type="button" onClick={() => set(it.id, "0")}
                      className="shrink-0 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-500 active:scale-95"
                      title="Dejar en cero"
                    >
                      0
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      {cambios.length > 0 && (
        <button className="mt-3 w-full rounded-xl bg-[#b45309] py-3 text-base font-extrabold text-white shadow active:brightness-95">
          Guardar cambios ({cambios.length})
        </button>
      )}
    </form>
  );
}
