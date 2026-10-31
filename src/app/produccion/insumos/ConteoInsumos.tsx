"use client";

import { useMemo, useState } from "react";
import { fmtCant } from "@/lib/dominio/materias";
import { contarInsumo } from "@/app/_shared/materias-operario";

type Mat = { id: string; nombre: string; unidad: string; stock: number };

/**
 * Conteo por SELECTOR (no lista larga): elige el insumo por nombre, se ve lo que
 * DEBERÍA quedar (lo que dice el sistema) y se anota cuánto queda de verdad.
 */
export default function ConteoInsumos({ materiales }: { materiales: Mat[] }) {
  const [id, setId] = useState("");
  const sel = useMemo(() => materiales.find((m) => m.id === id) ?? null, [id, materiales]);

  return (
    <form action={contarInsumo} className="rounded-2xl border border-[#b45309]/30 bg-amber-50/40 p-4 shadow-sm">
      <p className="text-sm font-extrabold text-slate-900">🔢 Anotar cuánto queda</p>
      <p className="mt-0.5 text-[11px] text-slate-500">Elige el insumo y pon cuánto queda. Se registra y se compara con lo que debería haber.</p>

      <select name="materiaPrimaId" value={id} onChange={(e) => setId(e.target.value)} required
        className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#b45309]">
        <option value="">Selecciona un insumo…</option>
        {materiales.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
      </select>

      {sel && (
        <div className="mt-2 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
          <span className="text-slate-500">Debería quedar (sistema):</span>
          <span className="font-extrabold text-slate-800">{fmtCant(sel.stock, sel.unidad)}</span>
        </div>
      )}

      <label className="mt-2 block text-xs font-bold text-slate-600">¿Cuánto queda realmente?
        <span className="mt-1 flex items-center gap-2">
          <input name="queda" inputMode="decimal" placeholder="0" required
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-right text-sm outline-none focus:border-[#b45309]" />
          <span className="w-10 text-xs text-slate-400">{sel?.unidad ?? ""}</span>
        </span>
      </label>

      <button disabled={!sel} className="mt-3 w-full rounded-xl bg-[#b45309] py-3 text-sm font-extrabold text-white shadow active:brightness-95 disabled:opacity-40">
        💾 Guardar conteo
      </button>
    </form>
  );
}
