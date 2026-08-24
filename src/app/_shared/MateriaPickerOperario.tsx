"use client";

import { useMemo, useState } from "react";
import { categoriaIcono, unidadLabel } from "@/lib/dominio/materias";

type Mat = { id: string; nombre: string; unidad: string; categoria: string };

/**
 * Selector de insumo para operarios: busca por nombre, elige y pone la cantidad.
 * NO muestra stock ni costos (privacidad). Se usa para ingresar (bodega) y
 * consumir (producción) según la `accion` y el `color`/`etiqueta` que reciba.
 */
export default function MateriaPickerOperario({
  materiales,
  accion,
  etiqueta,
  color,
}: {
  materiales: Mat[];
  accion: (formData: FormData) => void;
  etiqueta: string;
  color: string;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Mat | null>(null);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return materiales.filter((m) => m.nombre.toLowerCase().includes(t)).slice(0, 8);
  }, [q, materiales]);

  return (
    <form action={accion} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="materiaPrimaId" value={sel?.id ?? ""} />

      {sel ? (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 p-3">
          <span className="truncate font-bold text-slate-900">
            {categoriaIcono[sel.categoria]} {sel.nombre} <span className="text-slate-400">({unidadLabel[sel.unidad] ?? sel.unidad})</span>
          </span>
          <button type="button" onClick={() => setSel(null)} className="text-xs font-semibold" style={{ color }}>
            cambiar
          </button>
        </div>
      ) : (
        <div className="mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar insumo por nombre…"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none"
            style={{ borderColor: undefined }}
          />
          {q.trim() && (
            <div className="mt-2 space-y-1">
              {filtrados.length === 0 && <p className="px-2 text-xs text-slate-400">Sin resultados. Pídele a la central que lo cree.</p>}
              {filtrados.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setSel(m); setQ(""); }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left active:bg-slate-50"
                >
                  <span className="truncate text-sm font-semibold text-slate-800">{categoriaIcono[m.categoria]} {m.nombre}</span>
                  <span className="ml-2 shrink-0 text-xs text-slate-400">{unidadLabel[m.unidad] ?? m.unidad}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input
          name="cantidad"
          inputMode="decimal"
          placeholder={`Cantidad ${sel ? "(" + (unidadLabel[sel.unidad] ?? sel.unidad) + ")" : ""}`}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none"
        />
        <button
          disabled={!sel}
          className="shrink-0 rounded-xl px-5 py-3 text-sm font-extrabold text-white shadow disabled:opacity-40"
          style={{ backgroundColor: color }}
        >
          {etiqueta}
        </button>
      </div>
    </form>
  );
}
