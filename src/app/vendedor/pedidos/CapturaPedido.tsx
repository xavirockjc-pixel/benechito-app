"use client";

import { useState } from "react";
import { crearPedidoReparto, crearClienteParticular } from "../actions";
import { parsearPedidoWhatsapp } from "@/lib/dominio/reparto";

/** Nuevo pedido simple. Campos siempre visibles; pegar WhatsApp es opcional. */
export default function CapturaPedido({ clientes = [] }: { clientes?: string[] }) {
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pedido, setPedido] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [pago, setPago] = useState<"por_cobrar" | "pagado">("por_cobrar");
  const [sector, setSector] = useState("");
  const [guardarCliente, setGuardarCliente] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapsUrl, setMapsUrl] = useState<string | null>(null);
  const [raw, setRaw] = useState("");
  const [pegar, setPegar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  const hayUbicacion = lat != null || !!mapsUrl;

  function analizar() {
    const r = parsearPedidoWhatsapp(raw);
    if (r.pedido && !pedido.trim()) setPedido(r.pedido);
    if (r.telefono) setTelefono(r.telefono);
    setLat(r.lat); setLng(r.lng); setMapsUrl(r.mapsUrl);
  }

  function limpiar() {
    setCliente(""); setTelefono(""); setPedido(""); setMonto(""); setFecha(""); setSector("");
    setGuardarCliente(false); setLat(null); setLng(null); setMapsUrl(null); setRaw(""); setPegar(false); setPago("por_cobrar");
  }

  async function guardar() {
    if (guardando) return;
    const nom = cliente.trim();
    const ped = pedido.trim() || (nom ? "(por confirmar)" : "");
    if (!ped) return; // necesita al menos cliente o pedido
    setGuardando(true);
    const fd = new FormData();
    fd.set("pedido", ped);
    fd.set("cliente", nom);
    fd.set("telefono", telefono);
    fd.set("monto", String(Number(monto.replace(/[^0-9]/g, "")) || 0));
    fd.set("estadoPago", pago);
    if (fecha) fd.set("fecha", fecha);
    if (lat != null) fd.set("lat", String(lat));
    if (lng != null) fd.set("lng", String(lng));
    if (mapsUrl) fd.set("mapsUrl", mapsUrl);
    try {
      await crearPedidoReparto(fd);
      // Guardar también en mis clientes (particular), si se pidió.
      if (guardarCliente && nom) {
        const cf = new FormData();
        cf.set("nombre", nom);
        cf.set("telefono", telefono);
        cf.set("sector", sector);
        if (lat != null) cf.set("lat", String(lat));
        if (lng != null) cf.set("lng", String(lng));
        if (mapsUrl) cf.set("mapsUrl", mapsUrl);
        await crearClienteParticular(cf);
      }
      setOk(true);
      limpiar();
      setTimeout(() => setOk(false), 1800);
    } finally { setGuardando(false); }
  }

  const listo = cliente.trim() || pedido.trim();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-extrabold text-slate-900">➕ Nuevo pedido</p>

      <div className="mt-2 space-y-2">
        <input value={cliente} onChange={(e) => setCliente(e.target.value)} list="clientes-captura" placeholder="Cliente (nombre o negocio)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        <datalist id="clientes-captura">{clientes.map((c) => <option key={c} value={c} />)}</datalist>

        <textarea value={pedido} onChange={(e) => setPedido(e.target.value)} rows={2} placeholder="¿Qué lleva? (ej: 2 cajas tú y yo, 1 postre)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />

        <div className="flex gap-2">
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" placeholder="Teléfono (569…)"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
          <span className="flex items-center rounded-lg border border-slate-300 bg-white px-2">
            <span className="text-slate-400">$</span>
            <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="numeric" placeholder="Monto"
              className="w-24 px-1 py-2.5 text-right text-sm font-semibold outline-none" />
          </span>
        </div>

        {/* Pagado o fiado (por cobrar) */}
        <div className="flex gap-2">
          <button type="button" onClick={() => setPago("pagado")}
            className={`flex-1 rounded-lg border-2 py-2 text-sm font-bold ${pago === "pagado" ? "border-green-500 bg-green-50 text-green-700" : "border-slate-200 text-slate-500"}`}>💵 Pagado</button>
          <button type="button" onClick={() => setPago("por_cobrar")}
            className={`flex-1 rounded-lg border-2 py-2 text-sm font-bold ${pago === "por_cobrar" ? "border-amber-500 bg-amber-50 text-amber-700" : "border-slate-200 text-slate-500"}`}>📝 Fiado</button>
        </div>

        {/* Ubicación (opcional, pegando el WhatsApp) */}
        {hayUbicacion ? (
          <p className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-bold text-green-700">
            📍 Ubicación lista {lat != null ? `(${lat.toFixed(4)}, ${lng!.toFixed(4)})` : "(link de mapa)"} · <button type="button" onClick={() => { setLat(null); setLng(null); setMapsUrl(null); }} className="underline">quitar</button>
          </p>
        ) : (
          <button type="button" onClick={() => setPegar((v) => !v)} className="text-xs font-bold text-[#1479c4]">📋 {pegar ? "Ocultar" : "Pegar WhatsApp para sacar ubicación/teléfono"}</button>
        )}
        {pegar && !hayUbicacion && (
          <div className="rounded-lg bg-slate-50 p-2">
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={2} placeholder="Pega aquí el mensaje con la ubicación…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="button" onClick={analizar} disabled={!raw.trim()} className="mt-1 w-full rounded-lg bg-slate-800 py-2 text-xs font-bold text-white disabled:opacity-40">🔎 Sacar datos</button>
          </div>
        )}

        {/* Opciones (agendar otro día + guardar cliente) */}
        <label className="flex items-center justify-between text-xs font-bold text-slate-600">📅 Agendar para (opcional)
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <input type="checkbox" checked={guardarCliente} onChange={(e) => setGuardarCliente(e.target.checked)} className="h-4 w-4" />
          Guardar también en mis clientes (particular)
        </label>
        {guardarCliente && (
          <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Sector del cliente (ej: Coronel centro)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        )}

        <button type="button" onClick={guardar} disabled={!listo || guardando}
          className="w-full rounded-xl bg-[#1479c4] py-3 text-base font-extrabold text-white disabled:opacity-40">
          {ok ? "✓ Guardado" : guardando ? "Guardando…" : "Guardar pedido"}
        </button>
      </div>
    </div>
  );
}
