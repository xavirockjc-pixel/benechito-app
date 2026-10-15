"use client";

import { useState } from "react";
import { crearClienteParticular } from "../actions";
import { parsearPedidoWhatsapp } from "@/lib/dominio/reparto";

/** Agregar cliente particular fácil: pega el WhatsApp → saca teléfono y ubicación. */
export default function AgregarParticular({ sectores = [] }: { sectores?: string[] }) {
  const [raw, setRaw] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [sector, setSector] = useState("");
  const [fecha, setFecha] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [mapsUrl, setMapsUrl] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  function analizar() {
    const r = parsearPedidoWhatsapp(raw);
    if (r.telefono) setTelefono(r.telefono);
    setLat(r.lat); setLng(r.lng); setMapsUrl(r.mapsUrl);
  }

  async function guardar() {
    if (!nombre.trim() || guardando) return;
    setGuardando(true);
    const fd = new FormData();
    fd.set("nombre", nombre.trim());
    fd.set("telefono", telefono);
    fd.set("sector", sector.trim());
    if (fecha) fd.set("fechaEntrega", fecha);
    if (lat != null) fd.set("lat", String(lat));
    if (lng != null) fd.set("lng", String(lng));
    if (mapsUrl) fd.set("mapsUrl", mapsUrl);
    try {
      await crearClienteParticular(fd);
      setOk(true);
      setRaw(""); setNombre(""); setTelefono(""); setSector(""); setFecha(""); setLat(null); setLng(null); setMapsUrl(null);
      setTimeout(() => setOk(false), 1600);
    } finally { setGuardando(false); }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-extrabold text-slate-900">➕ Agregar cliente particular (fácil)</p>
      <p className="mt-0.5 text-[11px] text-slate-500">Pega el WhatsApp del cliente y toca Analizar: saca el teléfono y la ubicación solo.</p>

      <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={2}
        placeholder="Pega aquí el mensaje (con su número y/o ubicación de Maps)…"
        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
      <button type="button" onClick={analizar} disabled={!raw.trim()}
        className="mt-1 w-full rounded-lg bg-slate-800 py-2 text-xs font-bold text-white disabled:opacity-40">🔎 Analizar</button>

      <div className={`mt-2 rounded-lg px-3 py-1.5 text-[11px] font-bold ${lat != null ? "bg-green-100 text-green-700" : mapsUrl ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
        {lat != null ? `📍 Ubicación detectada (${lat.toFixed(4)}, ${lng!.toFixed(4)})` : mapsUrl ? "🔗 Link de mapa detectado" : "Sin ubicación (opcional)"}
      </div>

      <div className="mt-2 space-y-2">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre *" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input value={telefono} onChange={(e) => setTelefono(e.target.value)} inputMode="tel" placeholder="Teléfono (569…)" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={sector} onChange={(e) => setSector(e.target.value)} list="sectores-add" placeholder="Sector" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <datalist id="sectores-add">{sectores.map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <label className="flex items-center justify-between text-xs font-bold text-slate-600">📅 Fecha de entrega (opcional)
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <button type="button" onClick={guardar} disabled={!nombre.trim() || guardando}
          className="w-full rounded-xl bg-[#0f766e] py-2.5 text-sm font-extrabold text-white disabled:opacity-40">
          {ok ? "✓ Cliente agregado" : guardando ? "Guardando…" : "Agregar cliente"}
        </button>
      </div>
    </div>
  );
}
