"use client";

import { useMemo, useState } from "react";
import ControlVoz from "../ControlVoz";
import type { CambioVoz } from "@/lib/dominio/voz";
import { cargarVehiculoLote } from "../actions";

type Prod = { id: string; nombre: string; enBodega: number };

export default function CargarCamionVoz({ productos }: { productos: Prod[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const aplicar = (cambios: CambioVoz[]) =>
    setCart((c) => {
      const next = { ...c };
      for (const { productoId, delta } of cambios) {
        const n = (next[productoId] ?? 0) + delta;
        if (n <= 0) delete next[productoId];
        else next[productoId] = n;
      }
      return next;
    });
  const add = (id: string) => aplicar([{ productoId: id, delta: 1, nombre: "" }]);
  const sub = (id: string) => aplicar([{ productoId: id, delta: -1, nombre: "" }]);

  const lineas = Object.entries(cart).map(([id, cantidad]) => ({ productoId: id, nombre: porId.get(id)?.nombre ?? "", cantidad }));

  return (
    <div className="space-y-3">
      <ControlVoz
        productos={productos}
        onCambios={aplicar}
        etiqueta="Cargar por voz"
        hint="Di por ejemplo: “diez paletas de leche”, “cinco trufas”, “tres postres”."
      />

      {lineas.length > 0 && (
        <form action={cargarVehiculoLote} className="rounded-xl border border-slate-200 bg-white p-3">
          <input type="hidden" name="items" value={JSON.stringify(lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad })))} />
          <p className="mb-1 text-xs font-bold text-slate-600">Vas a cargar:</p>
          <ul className="divide-y divide-slate-100">
            {lineas.map((l) => (
              <li key={l.productoId} className="flex items-center justify-between py-2 text-sm">
                <span className="min-w-0 truncate font-semibold text-slate-800">{l.nombre}</span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => sub(l.productoId)} className="h-7 w-7 rounded bg-slate-100 font-bold">−</button>
                  <span className="w-6 text-center font-semibold">{l.cantidad}</span>
                  <button type="button" onClick={() => add(l.productoId)} className="h-7 w-7 rounded bg-slate-100 font-bold">+</button>
                </span>
              </li>
            ))}
          </ul>
          <button className="mt-2 w-full rounded-xl bg-[#1479c4] py-3 text-base font-extrabold text-white shadow active:brightness-95">
            Cargar al camión
          </button>
        </form>
      )}
    </div>
  );
}
