"use client";

import { useMemo, useState } from "react";
import ControlVoz from "../vendedor/ControlVoz";
import type { CambioVoz } from "@/lib/dominio/voz";
import { moverStockBodega } from "./actions";

type Item = { id: string; nombre: string };

/**
 * Arma un movimiento de bodega por voz. `signo` = +1 (entra) o -1 (sale/merma).
 * La voz siempre suma cantidades; el signo lo pone este componente al confirmar.
 */
export default function MovimientoBodegaVoz({
  catalogo,
  signo,
  etiqueta,
  hint,
  colorBoton,
  textoConfirmar,
}: {
  catalogo: Item[];
  signo: 1 | -1;
  etiqueta: string;
  hint: string;
  colorBoton: string;
  textoConfirmar: string;
}) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const porId = useMemo(() => new Map(catalogo.map((p) => [p.id, p])), [catalogo]);

  const aplicar = (cambios: CambioVoz[]) =>
    setCart((c) => {
      const next = { ...c };
      for (const { productoId, delta } of cambios) {
        // En bodega todo suma en valor absoluto; el "quita" por voz también reduce el conteo.
        const n = (next[productoId] ?? 0) + Math.abs(delta) * (delta < 0 ? -1 : 1);
        if (n <= 0) delete next[productoId];
        else next[productoId] = n;
      }
      return next;
    });
  const add = (id: string) => aplicar([{ productoId: id, delta: 1, nombre: "" }]);
  const sub = (id: string) => aplicar([{ productoId: id, delta: -1, nombre: "" }]);

  const lineas = Object.entries(cart).map(([id, cantidad]) => ({ id, nombre: porId.get(id)?.nombre ?? "", cantidad }));
  const itemsFirmados = lineas.map((l) => ({ id: l.id, delta: l.cantidad * signo }));

  return (
    <div className="space-y-3">
      <ControlVoz
        productos={catalogo}
        onCambios={aplicar}
        etiqueta={etiqueta}
        hint={hint}
      />

      {lineas.length > 0 && (
        <form action={moverStockBodega} className="rounded-xl border border-slate-200 bg-white p-3">
          <input type="hidden" name="items" value={JSON.stringify(itemsFirmados)} />
          <ul className="divide-y divide-slate-100">
            {lineas.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                <span className="min-w-0 truncate font-semibold text-slate-800">{l.nombre}</span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => sub(l.id)} className="h-7 w-7 rounded bg-slate-100 font-bold">−</button>
                  <span className="w-6 text-center font-semibold">{l.cantidad}</span>
                  <button type="button" onClick={() => add(l.id)} className="h-7 w-7 rounded bg-slate-100 font-bold">+</button>
                </span>
              </li>
            ))}
          </ul>
          <button className={`mt-2 w-full rounded-xl py-3 text-base font-extrabold text-white shadow active:brightness-95 ${colorBoton}`}>
            {textoConfirmar}
          </button>
        </form>
      )}
    </div>
  );
}
