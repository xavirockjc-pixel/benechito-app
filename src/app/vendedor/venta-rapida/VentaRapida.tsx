"use client";

import { useMemo, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { ETIQUETAS_VENTA, etiquetaVentaLabel, TIPOS_DOCUMENTO, tipoDocumentoLabel } from "@/lib/dominio/ventas";
import { ventaRapida } from "../actions";
import ControlVoz from "../ControlVoz";
import CarruselFotos from "@/app/_shared/CarruselFotos";
import type { CambioVoz } from "@/lib/dominio/voz";

type Tramo = { desde: number; precio: number };
type Prod = { id: string; nombre: string; formato: string | null; precio: number; fotoUrl?: string | null; fotos?: string[]; tramos?: Tramo[] };
type Cliente = { id: string; nombreNegocio: string; comuna: string };

/** Precio unitario según la cantidad: aplica el tramo de mayor volumen que alcance. */
function precioUnitDe(p: Prod, cantidad: number): number {
  let precio = p.precio;
  for (const t of p.tramos ?? []) if (cantidad >= t.desde) precio = t.precio; // tramos ordenados asc
  return precio;
}

export default function VentaRapida({ productos, clientes = [] }: { productos: Prod[]; clientes?: Cliente[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [q, setQ] = useState("");
  const [modo, setModo] = useState("efectivo");
  const [abono, setAbono] = useState("");
  const [verVenta, setVerVenta] = useState(false); // el panel de cobro se esconde hasta que quiera vender

  const clientesFiltrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return clientes.filter((c) => c.nombreNegocio.toLowerCase().includes(t) || (c.comuna ?? "").toLowerCase().includes(t)).slice(0, 6);
  }, [q, clientes]);
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
        const n = (next[productoId] ?? 0) + delta;
        if (n <= 0) delete next[productoId];
        else next[productoId] = n;
      }
      return next;
    });

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);
  const lineas = Object.entries(cart).map(([id, cantidad]) => {
    const p = porId.get(id)!;
    const precioUnit = precioUnitDe(p, cantidad); // aplica tramo por volumen según cantidad
    return { productoId: id, nombre: p.nombre, cantidad, precioUnit, precioBase: p.precio };
  });
  const total = lineas.reduce((s, l) => s + l.precioUnit * l.cantidad, 0);
  const abonoNum = Math.min(Math.max(Number(abono.replace(/[^0-9]/g, "")) || 0, 0), total);
  const restante = total - abonoNum;

  return (
    <div className="space-y-3">
      {productos.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
          No hay productos con precio para la venta directa. Cárgalos en Precios (panel), en la lista Reparto o Sala de Ventas.
        </p>
      )}

      {productos.length > 0 && <ControlVoz productos={productos} onCambios={aplicarVoz} />}

      {/* Catálogo con fotos (para mostrar al cliente y seleccionar) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {productos.map((p) => {
          const n = cart[p.id] ?? 0;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p.id)}
              className={`overflow-hidden rounded-2xl border text-left shadow-sm active:brightness-95 ${n > 0 ? "border-[#1479c4] ring-2 ring-blue-200" : "border-slate-200 bg-white"}`}
            >
              <span className="relative block aspect-square w-full bg-slate-100">
                <CarruselFotos urls={p.fotos && p.fotos.length ? p.fotos : p.fotoUrl ? [p.fotoUrl] : []} alt={p.nombre} className="h-full w-full" />
                {n > 0 && <span className="absolute right-1 top-1 z-10 grid h-6 min-w-6 place-items-center rounded-full bg-[#1479c4] px-1.5 text-xs font-extrabold text-white">{n}</span>}
              </span>
              <span className="block p-2">
                <span className="block truncate text-sm font-semibold text-slate-900">{p.nombre}</span>
                <span className="block text-[11px] text-slate-400">{p.formato ?? ""}</span>
                <span className="font-bold text-[#1479c4]">{fmtCLP(p.precio)}</span>
                {p.tramos && p.tramos.length > 0 && (
                  <span className="ml-1 text-[10px] font-bold text-green-600">📉 por mayor</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Barra compacta: el panel de venta se abre solo cuando quieren vender (no tapa el catálogo) */}
      {lineas.length > 0 && (
        <div className="sticky bottom-20 z-10">
          {!verVenta ? (
            <button type="button" onClick={() => setVerVenta(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 py-4 text-base font-extrabold text-white shadow-lg active:brightness-95">
              🛒 Ver venta · {lineas.length} ítem{lineas.length > 1 ? "s" : ""} · {fmtCLP(total)}
            </button>
          ) : (
            <button type="button" onClick={() => setVerVenta(false)}
              className="w-full rounded-2xl bg-slate-800 py-2.5 text-sm font-bold text-white shadow active:brightness-110">
              ▾ Seguir viendo el catálogo
            </button>
          )}
        </div>
      )}

      {/* Carrito (dentro del panel de venta) */}
      {verVenta && lineas.length > 0 && (
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
                    {fmtCLP(l.precioUnit)} c/u
                    {l.precioUnit < l.precioBase && <span className="ml-1 font-bold text-green-600">📉 mayoreo</span>}
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
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
            <span className="font-bold text-slate-700">Total</span>
            <span className="text-xl font-extrabold text-slate-900">{fmtCLP(total)}</span>
          </div>
        </div>
      )}

      {/* Cobro (dentro del panel de venta) */}
      {verVenta && (
      <form action={ventaRapida} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
        <input type="hidden" name="items" value={JSON.stringify(lineas)} />
        <input type="hidden" name="negocioId" value={cliente?.id ?? ""} />

        {/* Tipo de venta (etiqueta para historial) */}
        <select name="etiqueta" defaultValue="" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          <option value="">Tipo de venta: Normal</option>
          {ETIQUETAS_VENTA.filter((e) => e).map((e) => (
            <option key={e} value={e}>Tipo: {etiquetaVentaLabel[e]}</option>
          ))}
        </select>

        {/* Documento tributario (extensión Facturación). Factura requiere cliente con RUT/razón social/giro. */}
        <select name="tipoDocumento" defaultValue="boleta" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700">
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t} value={t}>📄 {tipoDocumentoLabel[t]}</option>
          ))}
        </select>

        {/* Cliente opcional (para abono / fiado) */}
        {cliente ? (
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5">
            <span className="min-w-0 truncate text-sm font-bold text-slate-800">🏪 {cliente.nombreNegocio}</span>
            <button type="button" onClick={() => { setCliente(null); if (modo === "abono" || modo === "credito") setModo("efectivo"); }} className="shrink-0 text-xs font-semibold text-slate-500">quitar</button>
          </div>
        ) : (
          <>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cliente (opcional, para abono o fiado)…"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#1479c4]"
            />
            {clientesFiltrados.length > 0 && (
              <div className="space-y-1">
                {clientesFiltrados.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setCliente(c); setQ(""); }} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-left text-sm active:bg-slate-50">
                    <span className="truncate font-semibold text-slate-800">{c.nombreNegocio}</span>
                    <span className="ml-2 shrink-0 text-xs text-slate-400">{c.comuna}</span>
                  </button>
                ))}
              </div>
            )}
            {q.trim().length >= 2 && clientesFiltrados.length === 0 && (
              <a href={`/vendedor/nuevo?nombre=${encodeURIComponent(q.trim())}`}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 active:brightness-95">
                ＋ Crear cliente «{q.trim()}»
              </a>
            )}
            {(modo === "abono" || modo === "credito") && (
              <input
                name="nombreLibre"
                placeholder="…o escribe un nombre (para fiar/abonar sin registrarlo)"
                className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-500"
              />
            )}
          </>
        )}

        <select name="modo" value={modo} onChange={(e) => setModo(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800">
          <option value="efectivo">Pago: Efectivo</option>
          <option value="transferencia">Pago: Transferencia</option>
          <option value="abono">Abono: paga una parte, queda debiendo</option>
          <option value="credito">Fiado (crédito)</option>
        </select>

        {modo === "abono" && (
          <div className="rounded-lg bg-amber-50 p-2.5">
            <label className="block text-xs font-bold text-slate-600">Monto que paga ahora
              <input name="abono" inputMode="numeric" value={abono} onChange={(e) => setAbono(e.target.value)} placeholder="Ej: 5000" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-amber-500" />
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
            ? `Cobrar ${fmtCLP(abonoNum)} · deuda ${fmtCLP(restante)}`
            : modo === "credito"
              ? `Fiar ${total > 0 ? fmtCLP(total) : ""}`
              : `Registrar venta ${total > 0 ? fmtCLP(total) : ""}`}
        </button>
      </form>
      )}
    </div>
  );
}
