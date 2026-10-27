"use client";

import { useMemo, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { MEDIOS_PAGO, medioPagoLabel, TIPOS_DOCUMENTO, tipoDocumentoLabel } from "@/lib/dominio/ventas";
import ControlVoz from "../vendedor/ControlVoz";
import type { CambioVoz } from "@/lib/dominio/voz";
import { venderCaja } from "./actions";

type Escalon = { desde: number; precio: number; label: string };
type Prod = { id: string; nombre: string; formato: string | null; escalera: Escalon[]; stock: number };
/** En el carrito solo guardamos cantidad y (opcional) un precio forzado a mano. */
type Item = { cantidad: number; precioManual?: number };
type Cliente = { id: string; nombreNegocio: string; comuna: string; rut: string | null };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Escalón que aplica según la cantidad (el de mayor "desde" alcanzado). */
function escalonActivo(esc: Escalon[], cantidad: number): Escalon | null {
  let activo: Escalon | null = null;
  for (const e of esc) if (cantidad >= e.desde) activo = e; // escalera ordenada asc
  return activo ?? esc[0] ?? null;
}
const precioAuto = (p: Prod, cantidad: number) => escalonActivo(p.escalera, cantidad)?.precio ?? 0;

export default function CajaPOS({ productos, clientes = [], errorFactura = false }: {
  productos: Prod[]; clientes?: Cliente[]; errorFactura?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Record<string, Item>>({});
  const [descuento, setDescuento] = useState("");
  // Cliente y documento tributario de la venta.
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [qCliente, setQCliente] = useState("");
  const [nuevoCliente, setNuevoCliente] = useState(false);
  const [tipoDoc, setTipoDoc] = useState("boleta");

  const clientesFiltrados = useMemo(() => {
    const t = qCliente.trim().toLowerCase();
    if (!t) return [];
    return clientes
      .filter((c) => c.nombreNegocio.toLowerCase().includes(t) || (c.comuna ?? "").toLowerCase().includes(t) || (c.rut ?? "").toLowerCase().includes(t))
      .slice(0, 6);
  }, [qCliente, clientes]);

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

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
      return { ...c, [id]: { cantidad, precioManual: prev?.precioManual } };
    });
  const setCantidad = (id: string, val: number) =>
    setCart((c) => {
      const prev = c[id];
      if (!prev) return c;
      if (!Number.isFinite(val) || val <= 0) {
        const next = { ...c };
        delete next[id];
        return next;
      }
      return { ...c, [id]: { ...prev, cantidad: Math.floor(val) } };
    });
  const setPrecioManual = (id: string, val: number) =>
    setCart((c) => (c[id] ? { ...c, [id]: { ...c[id], precioManual: Math.max(0, val) } } : c));
  const quitar = (id: string) => setCart((c) => { const n = { ...c }; delete n[id]; return n; });
  const vaciar = () => setCart({});

  const aplicarVoz = (cambios: CambioVoz[]) => cambios.forEach((c) => add(c.productoId, c.delta));

  const resultados = query.trim()
    ? productos.filter((p) => norm(p.nombre).includes(norm(query.trim()))).slice(0, 12)
    : [];

  // Líneas: precio unitario automático por cantidad (o el forzado a mano).
  const lineas = Object.entries(cart).map(([id, it]) => {
    const p = porId.get(id)!;
    const auto = escalonActivo(p.escalera, it.cantidad);
    const precioUnit = it.precioManual ?? auto?.precio ?? 0;
    return {
      productoId: id,
      nombre: p.nombre,
      cantidad: it.cantidad,
      precioUnit,
      manual: it.precioManual != null,
      tramoLabel: auto?.label ?? "",
    };
  });
  const itemsVenta = lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad, precioUnit: l.precioUnit }));

  const subtotal = lineas.reduce((s, l) => s + l.precioUnit * l.cantidad, 0);
  const desc = Math.max(0, Math.min(Number(descuento) || 0, subtotal));
  const total = subtotal - desc;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      {/* Búsqueda + voz */}
      <div className="space-y-3">
        <p className="rounded-lg bg-[#0f7a44]/5 px-3 py-2 text-xs font-semibold text-[#0f7a44] ring-1 ring-[#0f7a44]/15">
          💡 El precio se activa solo según la cantidad: 1 = unitario · 6+ minorista · 50+ mayorista. Puedes editar el precio de una línea si necesitas.
        </p>

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
              resultados.map((p) => {
                const unit = precioAuto(p, 1);
                const porMayor = p.escalera.some((e) => e.desde > 1);
                return (
                  <button key={p.id} type="button" onClick={() => add(p.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm active:bg-slate-50">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-900">{p.nombre}</span>
                      <span className="block text-xs text-slate-400">{p.formato ?? ""} · stock: {p.stock}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-bold text-[#0f7a44]">{unit > 0 ? fmtCLP(unit) : "sin precio"}</span>
                      {porMayor && <span className="block text-[10px] font-bold text-green-600">📉 baja por mayor</span>}
                    </span>
                  </button>
                );
              })
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
            {lineas.map((l) => (
              <li key={l.productoId} className="rounded-lg border border-slate-100 p-2">
                <div className="flex items-center justify-between">
                  <span className="min-w-0 truncate text-sm font-semibold text-slate-800">{l.nombre}</span>
                  <button type="button" onClick={() => quitar(l.productoId)} className="text-xs font-bold text-red-400">✕</button>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <button type="button" onClick={() => add(l.productoId, -1)} className="h-7 w-7 rounded bg-slate-100 font-bold">−</button>
                  <input type="number" min="1" step="1" inputMode="numeric" value={l.cantidad}
                    onChange={(e) => setCantidad(l.productoId, Number(e.target.value))}
                    className="w-12 rounded border border-slate-300 px-1 py-1 text-center text-sm font-semibold" />
                  <button type="button" onClick={() => add(l.productoId, 1)} className="h-7 w-7 rounded bg-slate-100 font-bold">+</button>
                  <span className="text-xs text-slate-400">×</span>
                  <input type="number" min="0" step="1" inputMode="numeric" value={l.precioUnit}
                    onChange={(e) => setPrecioManual(l.productoId, Number(e.target.value))}
                    className="w-20 rounded border border-slate-300 px-1 py-1 text-right text-sm font-semibold" />
                  <span className="ml-auto text-sm font-bold text-slate-900">{fmtCLP(l.precioUnit * l.cantidad)}</span>
                </div>
                {l.tramoLabel && (
                  <div className="mt-1 text-right text-[11px] font-bold">
                    {l.manual
                      ? <span className="text-amber-600">✎ precio manual</span>
                      : <span className="text-[#0f7a44]">✓ {l.tramoLabel}</span>}
                  </div>
                )}
              </li>
            ))}
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
          <input type="hidden" name="items" value={JSON.stringify(itemsVenta)} />
          <input type="hidden" name="descuento" value={String(desc)} />
          <input type="hidden" name="negocioId" value={cliente?.id ?? ""} />

          {errorFactura && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
              ⚠️ Para FACTURA el cliente necesita RUT, razón social y giro. Elige o crea el cliente con esos datos.
            </p>
          )}

          {/* Documento tributario */}
          <select name="tipoDocumento" value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#0f7a44]">
            {TIPOS_DOCUMENTO.map((t) => <option key={t} value={t}>📄 {tipoDocumentoLabel[t]}</option>)}
          </select>

          {/* Cliente (obligatorio para factura, opcional para boleta) */}
          {cliente ? (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5">
              <span className="min-w-0 truncate text-sm font-bold text-slate-800">
                🏪 {cliente.nombreNegocio}{cliente.rut ? <span className="ml-1 font-normal text-slate-400">{cliente.rut}</span> : null}
              </span>
              <button type="button" onClick={() => setCliente(null)} className="shrink-0 text-xs font-semibold text-slate-500">quitar</button>
            </div>
          ) : nuevoCliente ? (
            <div className="space-y-1.5 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-emerald-700">＋ Cliente nuevo</span>
                <button type="button" onClick={() => setNuevoCliente(false)} className="text-xs font-semibold text-slate-500">cancelar</button>
              </div>
              <input name="nuevoNombre" required placeholder="Nombre del cliente o negocio *" defaultValue={qCliente.trim()}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              <input name="nuevoWhatsapp" inputMode="tel" placeholder="WhatsApp (para enviarle el comprobante)"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
              {tipoDoc === "factura" && (
                <>
                  <input name="nuevoRut" required placeholder="RUT (ej: 76.123.456-7) *" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  <input name="nuevaRazonSocial" required placeholder="Razón social *" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                  <input name="nuevoGiro" required placeholder="Giro *" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" />
                </>
              )}
            </div>
          ) : (
            <>
              <input value={qCliente} onChange={(e) => setQCliente(e.target.value)}
                placeholder={tipoDoc === "factura" ? "Cliente con RUT (obligatorio para factura)…" : "Cliente (opcional)…"}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#0f7a44]" />
              {clientesFiltrados.length > 0 && (
                <div className="space-y-1">
                  {clientesFiltrados.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setCliente(c); setQCliente(""); }}
                      className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-left text-sm active:bg-slate-50">
                      <span className="truncate font-semibold text-slate-800">{c.nombreNegocio}</span>
                      <span className="ml-2 shrink-0 text-xs text-slate-400">{c.rut ?? c.comuna}</span>
                    </button>
                  ))}
                </div>
              )}
              {(qCliente.trim().length >= 2 || tipoDoc === "factura") && (
                <button type="button" onClick={() => setNuevoCliente(true)}
                  className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-emerald-400 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700 active:brightness-95">
                  ＋ Crear cliente{qCliente.trim() ? ` «${qCliente.trim()}»` : " nuevo"}
                </button>
              )}
            </>
          )}

          <select name="medio" defaultValue="efectivo" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#0f7a44]">
            {MEDIOS_PAGO.filter((m) => m !== "credito").map((m) => <option key={m} value={m}>{medioPagoLabel[m]}</option>)}
          </select>
          <button disabled={lineas.length === 0 || (tipoDoc === "factura" && !cliente && !nuevoCliente)}
            className="w-full rounded-lg bg-[#0f7a44] px-4 py-3.5 text-lg font-extrabold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
            Cobrar {total > 0 ? fmtCLP(total) : ""}
          </button>
        </form>
      </div>
    </div>
  );
}
