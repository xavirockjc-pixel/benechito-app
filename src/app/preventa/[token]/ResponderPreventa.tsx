"use client";

import { useMemo, useState } from "react";
import { dejarPedidoPreventa, posponerPreventa } from "../actions";

type Item = { id: string; nombre: string; sub: string };

/**
 * Selector del cliente: +/− por producto arma un texto de pedido, o el botón de
 * "esta vez paso". Ambos envían a los server actions (sin login, por token).
 */
export default function ResponderPreventa({ token, items }: { token: string; items: Item[] }) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [nota, setNota] = useState("");

  const set = (id: string, d: number) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] ?? 0) + d) }));
  const total = useMemo(() => Object.values(qty).reduce((s, n) => s + n, 0), [qty]);

  // Texto del pedido: "• 3 × Paleta de mora" por cada producto elegido.
  const detalle = useMemo(
    () => items.filter((it) => (qty[it.id] ?? 0) > 0).map((it) => `• ${qty[it.id]} × ${it.nombre}`).join("\n"),
    [qty, items],
  );

  return (
    <div className="space-y-4">
      {items.length === 0 ? (
        <p className="rounded-xl bg-crema px-3 py-4 text-center text-sm text-choco-2">Escríbenos en la nota lo que necesitas 👇</p>
      ) : (
        <ul className="divide-y divide-crema-2">
          {items.map((it) => {
            const n = qty[it.id] ?? 0;
            return (
              <li key={it.id} className="flex items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-tinta">{it.nombre}</span>
                  {it.sub && <span className="block text-[11px] text-choco-2">{it.sub}</span>}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <button type="button" onClick={() => set(it.id, -1)} disabled={n === 0}
                    className="grid h-8 w-8 place-items-center rounded-full bg-crema text-lg font-extrabold text-tinta disabled:opacity-30">−</button>
                  <span className={`w-6 text-center text-sm font-extrabold ${n > 0 ? "text-azul" : "text-choco-2"}`}>{n}</span>
                  <button type="button" onClick={() => set(it.id, +1)}
                    className="grid h-8 w-8 place-items-center rounded-full bg-azul text-lg font-extrabold text-white active:scale-90">+</button>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <label className="block text-xs font-bold text-choco-2">Nota (opcional)
        <input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: a la tarde mejor · agrégame sabores nuevos"
          className="mt-1 w-full rounded-xl border border-crema-2 bg-white px-3 py-2.5 text-sm text-tinta outline-none focus:border-azul" />
      </label>

      {/* Dejar pedido */}
      <form action={dejarPedidoPreventa}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="detalle" value={detalle} />
        <input type="hidden" name="nota" value={nota} />
        <button disabled={total === 0 && !nota.trim()}
          className="w-full rounded-2xl bg-gradient-to-r from-naranja to-naranja-2 py-3.5 text-base font-extrabold text-white shadow active:scale-[0.98] disabled:opacity-40">
          🛒 Dejar mi pedido{total > 0 ? ` (${total})` : ""}
        </button>
      </form>

      {/* Esta vez paso */}
      <form action={posponerPreventa}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="nota" value={nota} />
        <button className="w-full rounded-2xl border-2 border-crema-2 bg-white py-3 text-sm font-bold text-choco-2 active:scale-[0.98]">
          🙅 Esta vez paso — avísenme la próxima
        </button>
      </form>
    </div>
  );
}
