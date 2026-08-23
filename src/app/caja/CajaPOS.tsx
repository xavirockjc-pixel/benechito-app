"use client";

import { useMemo, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { MEDIOS_PAGO, medioPagoLabel } from "@/lib/dominio/ventas";
import ControlVoz from "../vendedor/ControlVoz";
import type { CambioVoz } from "@/lib/dominio/voz";
import { venderCaja } from "./actions";

type Prod = { id: string; nombre: string; formato: string | null; precios: Record<string, number>; stock: number };
type Lista = { id: string; nombre: string; canal: string };
type Linea = { productoId: string; cantidad: number; precioUnit: number };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function CajaPOS({ productos, listas, listaInicialId }: { productos: Prod[]; listas: Lista[]; listaInicialId: string }) {
  const [listaId, setListaId] = useState(listaInicialId);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, Linea>>({});
  const [descuento, setDescuento] = useState("");

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const precioEn = (p: Prod) => p.precios[listaId] ?? 0;

  const add = (id: string, n = 1) =>
    setCart((c) => {
      const p = porId.get(id);
      if (!p) return c;
      const prev = c[id];
      const cantidad = (prev?.cantidad ?? 0) + n;
      if (cantidad <= 0) {
        const next = { ...c };
        delete next[id];
        return next;
      }
      return { ...c, [id]: { productoId: id, cantidad, precioUnit: prev?.precioUnit ?? precioEn(p) } };
    });
  const setLinea = (id: string, campo: "cantidad" | "precioUnit", val: number) =>
    setCart((c) => {
      const prev = c[id];
      if (!prev) return c;
      if (campo === "cantidad" && val <= 0) {
        const next = { ...c };
        delete next[id];
        return next;
      }
      return { ...c, [id]: { ...prev, [campo]: val } };
    });
  const quitar = (id: string) => setCart((c) => { const n = { ...c }; delete n[id]; return n; });
  const vaciar = () => setCart({});

  const aplicarVoz = (cambios: CambioVoz[]) => cambios.forEach((c) => add(c.productoId, c.delta));

  const resultados = query.trim()
    ? productos.filter((p) => norm(p.nombre).includes(norm(query.trim()))).slice(0, 12)
    : [];

  const lineas = Object.values(cart);
  const subtotal = lineas.reduce((s, l) => s + l.precioUnit * l.cantidad, 0);
  const desc = Math.max(0, Math.min(Number(descuento) || 0, subtotal));
  const total = subtotal - desc;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      {/* Búsqueda + voz */}
      <div className="space-y-3">
        <label className="block text-sm font-bold text-slate-700">Tipo de comprador (precios)
          <select value={listaId} onChange={(e) => setListaId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#0f7a44]">
            {listas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
          </select>
        </label>

        <ControlVoz
          productos={productos.map((p) => ({ id: p.id, nombre: p.nombre }))}
          onCambios={aplicarVoz}
          etiqueta="Agregar por voz"
          hint="Di por ejemplo: “dos trufas”, “quita una paleta”."
        />

        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto por palabra…"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-800 outline-none focus:border-[#0f7a44]" />

        {query.trim() && (
          <div className="space-y-1">
            {resultados.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">Sin resultados.</p>
            ) : (
              resultados.map((p) => (
                <button key={p.id} type="button" onClick={() => add(p.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm active:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-900">{p.nombre}</span>
                    <span className="block text-xs text-slate-400">{p.formato ?? ""} · stock: {p.stock}</span>
                  </span>
                  <span className="font-bold text-[#0f7a44]">{fmtCLP(precioEn(p))}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Carrito */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Venta</h2>
          {lineas.length > 0 && <button type="button" onClick={vaciar} className="text-xs font-bold text-red-500">🗑️ Vaciar</button>}
        </div>

        {lineas.length === 0 ? (
          <p className="text-sm text-slate-500">Busca o dicta un producto para agregarlo.</p>
        ) : (
          <ul className="space-y-2">
            {lineas.map((l) => {
              const p = porId.get(l.productoId)!;
              return (
                <li key={l.productoId} className="rounded-lg border border-slate-100 p-2">
                  <div className="flex items-center justify-between">
                    <span className="min-w-0 truncate text-sm font-semibold text-slate-800">{p.nombre}</span>
                    <button type="button" onClick={() => quitar(l.productoId)} className="text-xs font-bold text-red-400">✕</button>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <button type="button" onClick={() => add(l.productoId, -1)} className="h-7 w-7 rounded bg-slate-100 font-bold">−</button>
                    <input type="number" min="1" step="1" inputMode="numeric" value={l.cantidad}
                      onChange={(e) => setLinea(l.productoId, "cantidad", Number(e.target.value))}
                      className="w-12 rounded border border-slate-300 px-1 py-1 text-center text-sm font-semibold" />
                    <button type="button" onClick={() => add(l.productoId, 1)} className="h-7 w-7 rounded bg-slate-100 font-bold">+</button>
                    <span className="text-xs text-slate-400">×</span>
                    <input type="number" min="0" step="1" inputMode="numeric" value={l.precioUnit}
                      onChange={(e) => setLinea(l.productoId, "precioUnit", Number(e.target.value))}
                      className="w-20 rounded border border-slate-300 px-1 py-1 text-right text-sm font-semibold" />
                    <span className="ml-auto text-sm font-bold text-slate-900">{fmtCLP(l.precioUnit * l.cantidad)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Descuento / promoción */}
        <label className="mt-3 flex items-center justify-between gap-2 text-sm font-semibold text-slate-600">
          Descuento / promo
          <input type="number" min="0" step="1" inputMode="numeric" value={descuento} onChange={(e) => setDescuento(e.target.value)}
            placeholder="0" className="w-24 rounded border border-slate-300 px-2 py-1 text-right text-sm" />
        </label>

        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="font-bold text-slate-700">Total</span>
          <span className="text-2xl font-extrabold text-slate-900">{fmtCLP(total)}</span>
        </div>

        <form action={venderCaja} className="mt-4 space-y-2">
          <input type="hidden" name="items" value={JSON.stringify(lineas)} />
          <input type="hidden" name="descuento" value={String(desc)} />
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
