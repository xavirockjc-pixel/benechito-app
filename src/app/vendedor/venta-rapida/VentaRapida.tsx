"use client";

import { useMemo, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { ventaRapida } from "../actions";
import ControlVoz from "../ControlVoz";
import type { CambioVoz } from "@/lib/dominio/voz";

type Prod = { id: string; nombre: string; formato: string | null; precio: number };

export default function VentaRapida({ productos }: { productos: Prod[] }) {
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
  const aplicarVoz = (cambios: CambioVoz[]) =>
    setCart((c) => {
      const next = { ...c };
      for (const { productoId, delta } of cambios) {
        const n = (next[productoId] ?? 0) + delta;
        if (n <= 0) delete next[productoId];
        else next[productoId] = n;
      }
      return next;
    });

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const lineas = Object.entries(cart).map(([id, cantidad]) => {
    const p = porId.get(id)!;
    return { productoId: id, nombre: p.nombre, cantidad, precioUnit: p.precio };
  });
  const total = lineas.reduce((s, l) => s + l.precioUnit * l.cantidad, 0);

  return (
    <div className="space-y-3">
      {productos.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
          No hay productos con precio para la venta directa. Cárgalos en Precios (panel), en la lista Reparto o Sala de Ventas.
        </p>
      )}

      {productos.length > 0 && <ControlVoz productos={productos} onCambios={aplicarVoz} />}

      {/* Productos */}
      <div className="grid grid-cols-2 gap-2">
        {productos.map((p) => {
          const n = cart[p.id] ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p.id)}
              className={`rounded-xl border p-3 text-left shadow-sm active:brightness-95 ${n > 0 ? "border-[#1479c4] bg-blue-50" : "border-slate-200 bg-white"}`}
            >
              <span className="block truncate font-semibold text-slate-900">{p.nombre}</span>
              <span className="block text-xs text-slate-400">{p.formato ?? ""}</span>
              <span className="mt-1 flex items-center justify-between">
                <span className="font-bold text-[#1479c4]">{fmtCLP(p.precio)}</span>
                {n > 0 && <span className="rounded-full bg-[#1479c4] px-2 text-xs font-bold text-white">{n}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {/* Carrito */}
      {lineas.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <ul className="divide-y divide-slate-100">
            {lineas.map((l) => (
              <li key={l.productoId} className="flex items-center justify-between py-2 text-sm">
                <span className="min-w-0 truncate font-semibold text-slate-800">{l.nombre}</span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => sub(l.productoId)} className="h-7 w-7 rounded bg-slate-100 font-bold">−</button>
                  <span className="w-6 text-center font-semibold">{l.cantidad}</span>
                  <button type="button" onClick={() => add(l.productoId)} className="h-7 w-7 rounded bg-slate-100 font-bold">+</button>
                  <span className="w-16 text-right font-semibold text-slate-900">{fmtCLP(l.precioUnit * l.cantidad)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-bold text-slate-700">Total</span>
            <span className="text-xl font-extrabold text-slate-900">{fmtCLP(total)}</span>
          </div>
        </div>
      )}

      {/* Cobro */}
      <form action={ventaRapida} className="sticky bottom-20 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
        <input type="hidden" name="items" value={JSON.stringify(lineas)} />
        <select name="modo" defaultValue="efectivo" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800">
          <option value="efectivo">Pago: Efectivo</option>
          <option value="transferencia">Pago: Transferencia</option>
        </select>
        <button
          disabled={lineas.length === 0}
          className="w-full rounded-xl bg-green-600 py-3 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40"
        >
          Registrar venta {total > 0 ? fmtCLP(total) : ""}
        </button>
      </form>
    </div>
  );
}
