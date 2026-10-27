"use client";

import { useMemo, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { TIPOS_DOCUMENTO, tipoDocumentoLabel } from "@/lib/dominio/ventas";
import { venderTerreno } from "../../../actions";
import ControlVoz from "../../../ControlVoz";
import { palabraPack } from "@/lib/dominio/empaque";
import type { CambioVoz } from "@/lib/dominio/voz";

type Tramo = { desde: number; precio: number };
type Prod = { id: string; nombre: string; formato: string | null; unidadesPack?: number | null; precio: number; tramos?: Tramo[] };

/** Precio unitario según la cantidad: aplica el tramo de mayor volumen que alcance. */
function precioUnitDe(p: Prod, cantidad: number): number {
  let precio = p.precio;
  for (const t of p.tramos ?? []) if (cantidad >= t.desde) precio = t.precio;
  return precio;
}

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
  const setQty = (id: string, n: number) =>
    setCart((c) => {
      const next = { ...c };
      if (!Number.isFinite(n) || n <= 0) delete next[id];
      else next[id] = Math.floor(n);
      return next;
    });
  const aplicarVoz = (cambios: CambioVoz[]) =>
    setCart((c) => {
      const next = { ...c };
      for (const { productoId, delta } of cambios) {
        // En productos por bolsa/pack, la voz dice unidades → se convierten a bolsas.
        const pack = productos.find((p) => p.id === productoId)?.unidadesPack ?? 0;
        const d = pack > 0 ? Math.round(delta / pack) : delta;
        if (d === 0) continue;
        const n = (next[productoId] ?? 0) + d;
        if (n <= 0) delete next[productoId];
        else next[productoId] = n;
      }
      return next;
    });

  const [modo, setModo] = useState("efectivo");
  const [tipoDoc, setTipoDoc] = useState(docDefault || "boleta");
  const [abono, setAbono] = useState("");
  const [aumento, setAumento] = useState(""); // flete / sector (suma)
  const [descuento, setDescuento] = useState(""); // por cantidad / volumen (resta)

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  // Los helados se venden por BOLSA/PACK (tú y yo y paletas ×50, postres ×16): la
  // cantidad del carrito son bolsas; el precio se calcula por unidad según el total.
  const lineas = Object.entries(cart).map(([id, q]) => {
    const p = porId.get(id)!;
    const pack = p.unidadesPack ?? 0;
    if (pack > 0) {
      const unidades = q * pack;
      const unit = precioUnitDe(p, unidades); // tramo por volumen, según unidades
      const porPack = unit * pack;
      return { productoId: id, nombre: p.nombre, pack, packs: q, unidades, unit, precioUnit: porPack, cantidad: q, sub: porPack * q, precioBase: p.precio };
    }
    const unit = precioUnitDe(p, q);
    return { productoId: id, nombre: p.nombre, pack: 0, packs: 0, unidades: q, unit, precioUnit: unit, cantidad: q, sub: unit * q, precioBase: p.precio };
  });
  const subtotal = lineas.reduce((s, l) => s + l.sub, 0);
  const totalUnidades = lineas.reduce((s, l) => s + l.unidades, 0);
  const aumentoN = Math.max(0, Number(aumento.replace(/[^0-9]/g, "")) || 0);
  const descuentoN = Math.min(Math.max(0, Number(descuento.replace(/[^0-9]/g, "")) || 0), subtotal + aumentoN);
  const total = subtotal + aumentoN - descuentoN; // total final (con aumento y descuento)
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
              <span className="block text-xs text-slate-400">{p.unidadesPack && p.unidadesPack > 0 ? `${palabraPack(p.unidadesPack)} ×${p.unidadesPack}` : (p.formato ?? "")}</span>
              <span className="mt-1 flex items-center justify-between">
                <span className="font-bold text-[#1479c4]">{fmtCLP(p.precio)}{p.tramos && p.tramos.length > 0 && <span className="ml-1 text-[10px] font-bold text-green-600">📉 x mayor</span>}</span>
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
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-800">{l.nombre}</span>
                  <span className="text-[11px] text-slate-400">
                    {l.pack > 0
                      ? <>{l.packs} {palabraPack(l.pack)}{l.packs !== 1 ? "s" : ""} de {l.pack} = {l.unidades} u · {fmtCLP(l.unit)}/u</>
                      : <>{fmtCLP(l.unit)} c/u</>}
                    {l.unit < l.precioBase && <span className="ml-1 font-bold text-green-600">📉 mayoreo</span>}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => sub(l.productoId)} className="h-9 w-9 rounded-lg bg-slate-100 text-lg font-bold active:bg-slate-200">−</button>
                  <input type="number" inputMode="numeric" min={1} value={l.cantidad}
                    onChange={(e) => setQty(l.productoId, Number(e.target.value))}
                    className="w-14 rounded-lg border border-slate-300 py-1 text-center text-base font-bold text-slate-900 outline-none focus:border-[#1479c4]" />
                  <button type="button" onClick={() => add(l.productoId)} className="h-9 w-9 rounded-lg bg-slate-100 text-lg font-bold active:bg-slate-200">+</button>
                  <span className="w-16 text-right font-semibold text-slate-900">{fmtCLP(l.precioUnit * l.cantidad)}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Subtotal <span className="text-xs text-slate-400">· {totalUnidades} helados</span></span>
              <span className="font-semibold text-slate-800">{fmtCLP(subtotal)}</span>
            </div>
            {/* Aumento (flete / sector) — arriba */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-green-700">➕ Aumento (flete / sector)</label>
              <input value={aumento} onChange={(e) => setAumento(e.target.value)} inputMode="numeric" placeholder="0"
                className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm font-bold text-slate-900 outline-none focus:border-green-500" />
            </div>
            {/* Descuento (cantidad / volumen) — abajo */}
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-bold text-[#b45309]">➖ Descuento (volumen)</label>
              <input value={descuento} onChange={(e) => setDescuento(e.target.value)} inputMode="numeric" placeholder="0"
                className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm font-bold text-slate-900 outline-none focus:border-[#b45309]" />
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-1.5">
              <span className="font-bold text-slate-700">Total</span>
              <span className="text-xl font-extrabold text-slate-900">{fmtCLP(total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Cobro */}
      <form action={venderTerreno} className="sticky bottom-20 space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
        <input type="hidden" name="negocioId" value={negocioId} />
        <input type="hidden" name="items" value={JSON.stringify(lineas)} />
        <input type="hidden" name="aumento" value={aumentoN} />
        <input type="hidden" name="descuento" value={descuentoN} />
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
