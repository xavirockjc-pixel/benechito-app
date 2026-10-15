"use client";

import { useState } from "react";
import { crearPedidoReparto } from "../actions";
import { parsearPedidoWhatsapp } from "@/lib/dominio/reparto";

/** Pega el mensaje de WhatsApp → extrae ubicación/teléfono → guarda el pedido. */
export default function CapturaPedido() {
  const [raw, setRaw] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [pedido, setPedido] = useState("");
  const [monto, setMonto] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapsUrl, setMapsUrl] = useState<string | null>(null);
  const [analizado, setAnalizado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  function analizar() {
    const r = parsearPedidoWhatsapp(raw);
    setPedido(r.pedido || raw);
    if (r.telefono) setTelefono(r.telefono);
    setLat(r.lat); setLng(r.lng); setMapsUrl(r.mapsUrl);
    setAnalizado(true);
  }

  async function guardar() {
    const texto = (pedido || raw).trim();
    if (!texto || guardando) return;
    setGuardando(true);
    const fd = new FormData();
    fd.set("pedido", texto);
    fd.set("cliente", cliente);
    fd.set("telefono", telefono);
    fd.set("monto", String(Number(monto.replace(/[^0-9]/g, "")) || 0));
    if (lat != null) fd.set("lat", String(lat));
    if (lng != null) fd.set("lng", String(lng));
    if (mapsUrl) fd.set("mapsUrl", mapsUrl);
    try {
      await crearPedidoReparto(fd);
      setOk(true);
      setRaw(""); setCliente(""); setTelefono(""); setPedido(""); setMonto("");
      setLat(null); setLng(null); setMapsUrl(null); setAnalizado(false);
      setTimeout(() => setOk(false), 1600);
    } finally { setGuardando(false); }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-extrabold text-slate-900">➕ Nuevo pedido de WhatsApp</p>
      <p className="mt-0.5 text-[11px] text-slate-500">Pega el mensaje del cliente (con su ubicación de Maps/Waze) y toca Analizar.</p>

      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={3}
        placeholder="Pega aquí el mensaje de WhatsApp (pedido + link de ubicación)…"
        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
      <button type="button" onClick={analizar} disabled={!raw.trim()}
        className="mt-2 w-full rounded-xl bg-slate-800 py-2.5 text-sm font-bold text-white disabled:opacity-40">🔎 Analizar</button>

      {analizado && (
        <div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3">
          <div className={`rounded-lg px-3 py-2 text-xs font-bold ${lat != null ? "bg-green-100 text-green-700" : mapsUrl ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
            {lat != null ? `📍 Ubicación detectada (${lat.toFixed(4)}, ${lng!.toFixed(4)})` : mapsUrl ? "🔗 Link de mapa detectado (sin coordenadas exactas)" : "⚠️ No se detectó ubicación en el mensaje"}
          </div>
          <input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Cliente (nombre)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" placeholder="Teléfono (569…)"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <span className="flex items-center rounded-lg border border-slate-300 bg-white px-2">
              <span className="text-slate-400">$</span>
              <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="numeric" placeholder="Monto"
                className="w-24 px-1 py-2 text-right text-sm font-semibold outline-none" />
            </span>
          </div>
          <textarea value={pedido} onChange={(e) => setPedido(e.target.value)} rows={2} placeholder="Qué pidió"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button type="button" onClick={guardar} disabled={guardando}
            className="w-full rounded-xl bg-[#1479c4] py-2.5 text-sm font-extrabold text-white disabled:opacity-40">
            {ok ? "✓ Agendado" : guardando ? "Guardando…" : "Agendar pedido"}
          </button>
        </div>
      )}
      {ok && !analizado && <p className="mt-2 text-center text-xs font-bold text-green-600">✓ Pedido agendado</p>}
    </div>
  );
}
