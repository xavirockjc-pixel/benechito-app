"use client";

import { useMemo, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { TIPOS_DOCUMENTO, tipoDocumentoLabel } from "@/lib/dominio/ventas";
import { venderTerreno } from "../../../actions";
import ControlVoz from "../../../ControlVoz";
import type { CambioVoz } from "@/lib/dominio/voz";

type Prod = { id: string; nombre: string; formato: string | null; precio: number };

export default function VenderTerreno({
  negocioId,
  productos,
  canales = [],
  docDefault = "boleta",
  faltaFactura = [],
}: {
  negocioId: string;
  productos: Prod[];
  canales?: { codigo: string; nombre: string }[];
  docDefault?: string;
  faltaFactura?: string[];
}) {
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

  const [modo, setModo] = useState("efectivo");
  const [tipoDoc, setTipoDoc] = useState(docDefault || "boleta");
  const [abono, setAbono] = useState("");

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const lineas = Object.entries(cart).map(([id, cantidad]) => {
    const p = porId.get(id)!;
    return { productoId: id, nombre: p.nombre, cantidad, precioUnit: p.precio };
  });
  const total = lineas.reduce((s, l) => s + l.precioUnit * l.cantidad, 0);
  const abonoNum = Math.min(Math.max(Number(abono.replace(/[^0-9]/g, "")) || 0, 0), total);
  const restante = total - abonoNum;

  return (
    <div className="space-y-3">
      {productos.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
          Este cliente no tiene productos con precio en su lista. Cárgalos en Precios (panel).
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
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Venta</span>
            <button type="button" onClick={() => setCart({})} className="text-xs font-bold text-red-500 active:brightness-95">🗑️ Vaciar</button>
          </div>
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
      <form action={venderTerreno} className="sticky bottom-20 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
        <input type="hidden" name="negocioId" value={negocioId} />
        <input type="hidden" name="items" value={JSON.stringify(lineas)} />
        {canales.length > 0 && (
          <select name="canal" defaultValue="" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800">
            <option value="">📍 Canal automático</option>
            {canales.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
          </select>
        )}
        <select name="tipoDocumento" value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800">
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t} value={t}>📄 {tipoDocumentoLabel[t]}</option>
          ))}
        </select>
        {tipoDoc === "factura" && faltaFactura.length > 0 && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            ⚠️ Para facturar falta {faltaFactura.join(", ")} del cliente. Complétalo en su ficha antes de cerrar.
          </p>
        )}
        <select name="modo" value={modo} onChange={(e) => setModo(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800">
          <option value="efectivo">Pago: Efectivo</option>
          <option value="transferencia">Pago: Transferencia</option>
          <option value="abono">Abono: paga una parte, queda debiendo</option>
          <option value="credito">Dejar a crédito (fiado)</option>
        </select>

        {modo === "abono" && (
          <div className="rounded-lg bg-amber-50 p-2.5">
            <label className="block text-xs font-bold text-slate-600">Monto que paga ahora
              <input
                name="abono"
                inputMode="numeric"
                value={abono}
                onChange={(e) => setAbono(e.target.value)}
                placeholder="Ej: 20000"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-amber-500"
              />
            </label>
            <select name="medioAbono" defaultValue="efectivo" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">
              <option value="efectivo">Con efectivo</option>
              <option value="transferencia">Con transferencia</option>
            </select>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-600">Queda debiendo</span>
              <span className="font-extrabold text-red-600">{fmtCLP(restante)}</span>
            </div>
          </div>
        )}

        <button
          disabled={lineas.length === 0}
          className="w-full rounded-xl bg-green-600 py-3 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40"
        >
          {modo === "abono"
            ? `Cobrar ${fmtCLP(abonoNum)} y dejar ${fmtCLP(restante)} de deuda`
            : `Confirmar venta ${total > 0 ? fmtCLP(total) : ""}`}
        </button>
      </form>
    </div>
  );
}
