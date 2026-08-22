"use client";

import { useMemo, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { MEDIOS_PAGO, medioPagoLabel } from "@/lib/dominio/ventas";
import { venderCaja } from "./actions";

type Prod = { id: string; nombre: string; formato: string | null; precio: number };

export default function CajaPOS({ productos }: { productos: Prod[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const lineas = Object.entries(cart).map(([id, cantidad]) => {
    const p = porId.get(id)!;
    return { productoId: id, nombre: p.nombre, cantidad, precioUnit: p.precio };
  });
  const total = lineas.reduce((s, l) => s + l.precioUnit * l.cantidad, 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      {/* Productos */}
      <div>
        {productos.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            No hay productos con precio en la lista “Sala de Ventas”. Cárgalos en el panel (Precios).
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {productos.map((p) => (
              <button key={p.id} type="button" onClick={() => add(p.id)}
                className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-[#0f7a44] hover:shadow active:scale-[.98]">
                <span className="block truncate font-semibold text-slate-900">{p.nombre}</span>
                <span className="block text-xs text-slate-400">{p.formato ?? ""}</span>
                <span className="mt-1 block font-bold text-[#0f7a44]">{fmtCLP(p.precio)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Carrito */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-20 lg:self-start">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Venta</h2>
        {lineas.length === 0 ? (
          <p className="text-sm text-slate-500">Toca un producto para agregarlo.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lineas.map((l) => (
              <li key={l.productoId} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0"><span className="block truncate font-semibold text-slate-800">{l.nombre}</span>
                  <span className="text-xs text-slate-400">{fmtCLP(l.precioUnit)} c/u</span></span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => sub(l.productoId)} className="h-7 w-7 rounded bg-slate-100 font-bold text-slate-700">−</button>
                  <span className="w-6 text-center font-semibold">{l.cantidad}</span>
                  <button type="button" onClick={() => add(l.productoId)} className="h-7 w-7 rounded bg-slate-100 font-bold text-slate-700">+</button>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="font-bold text-slate-700">Total</span>
          <span className="text-2xl font-extrabold text-slate-900">{fmtCLP(total)}</span>
        </div>

        <form action={venderCaja} className="mt-4 space-y-2">
          <input type="hidden" name="items" value={JSON.stringify(lineas)} />
          <select name="medio" defaultValue="efectivo" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#0f7a44]">
            {MEDIOS_PAGO.filter((m) => m !== "credito").map((m) => <option key={m} value={m}>{medioPagoLabel[m]}</option>)}
          </select>
          <button disabled={lineas.length === 0}
            className="w-full rounded-lg bg-[#0f7a44] px-4 py-3.5 text-lg font-extrabold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
            Cobrar {total > 0 ? fmtCLP(total) : ""}
          </button>
        </form>
      </div>
    </div>
  );
}
