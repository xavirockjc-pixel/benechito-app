"use client";

import { useMemo, useState } from "react";
import ControlVoz from "../../../ControlVoz";
import type { CambioVoz } from "@/lib/dominio/voz";
import { reponerPunto } from "../../../actions";

type Sabor = { id: string; nombre: string; linea: string; enCaja: number };

const lineaLabel: Record<string, string> = { trufa: "Trufas", cuchufli: "Cuchuflís", helado: "Helados" };

export default function ReponerForm({ negocioId, sabores }: { negocioId: string; sabores: Sabor[] }) {
  const [cant, setCant] = useState<Record<string, number>>({});
  const capMax = useMemo(() => new Map(sabores.map((s) => [s.id, s.enCaja])), [sabores]);

  const set = (id: string, n: number) => {
    const max = capMax.get(id) ?? 0;
    const val = Math.max(0, Math.min(n, max));
    setCant((c) => {
      const next = { ...c };
      if (val <= 0) delete next[id];
      else next[id] = val;
      return next;
    });
  };

  const aplicarVoz = (cambios: CambioVoz[]) =>
    cambios.forEach(({ productoId, delta }) => set(productoId, (cant[productoId] ?? 0) + delta));

  const porLinea = sabores.reduce<Record<string, Sabor[]>>((acc, s) => {
    (acc[s.linea] ??= []).push(s);
    return acc;
  }, {});

  const total = Object.values(cant).reduce((a, b) => a + b, 0);

  return (
    <form action={reponerPunto} className="mt-4">
      <input type="hidden" name="negocioId" value={negocioId} />

      <ControlVoz
        productos={sabores.map((s) => ({ id: s.id, nombre: s.nombre }))}
        onCambios={aplicarVoz}
        etiqueta="Contar por voz"
        hint="Di por ejemplo: “tres frutilla y dos pistacho”, “cinco chocolate”."
      />

      {Object.entries(porLinea).map(([linea, items]) => (
        <div key={linea} className="mt-4">
          <h2 className="mb-2 text-sm font-bold text-slate-900">{lineaLabel[linea] ?? linea}</h2>
          <div className="space-y-1">
            {items.map((s) => (
              <label key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-800">{s.nombre}</span>
                  <span className={`block text-xs ${s.enCaja > 0 ? "text-slate-400" : "text-red-400"}`}>en caja: {s.enCaja}</span>
                </span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => set(s.id, (cant[s.id] ?? 0) - 1)} className="h-8 w-8 rounded bg-slate-100 font-bold">−</button>
                  <input
                    type="number"
                    name={`sabor_${s.id}`}
                    min="0"
                    max={s.enCaja}
                    step="1"
                    inputMode="numeric"
                    value={cant[s.id] ?? ""}
                    placeholder="0"
                    onChange={(e) => set(s.id, Number(e.target.value))}
                    className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-right text-sm font-semibold"
                  />
                  <button type="button" onClick={() => set(s.id, (cant[s.id] ?? 0) + 1)} className="h-8 w-8 rounded bg-slate-100 font-bold">+</button>
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button className="sticky bottom-20 mt-5 w-full rounded-xl bg-[#1479c4] py-3 text-base font-extrabold text-white shadow-lg active:brightness-95">
        Confirmar reposición {total > 0 ? `(${total} u.)` : ""}
      </button>
    </form>
  );
}
