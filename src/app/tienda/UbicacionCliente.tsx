"use client";

import { useState } from "react";
import { resolverLinkMapa } from "@/app/admin/negocios/actions";

/**
 * En la tienda, cuando el cliente pide con DESPACHO: comparte su ubicación con un
 * toque (GPS) o pegando el link de Google Maps. Envía lat/lng ocultos con el pedido
 * para que el local sepa a dónde llevar.
 */
export default function UbicacionCliente({ titulo = "📍 Comparte tu ubicación para el despacho" }: { titulo?: string }) {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [link, setLink] = useState("");
  const [estado, setEstado] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const gps = () => {
    if (!("geolocation" in navigator)) { setEstado("Tu teléfono no permite ubicación."); return; }
    setEstado("Obteniendo tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (p) => { setLat(Number(p.coords.latitude.toFixed(6))); setLng(Number(p.coords.longitude.toFixed(6))); setEstado("✅ ¡Ubicación compartida!"); },
      (err) => setEstado(err.code === 1 ? "Diste permiso denegado. Puedes pegar el link de Google Maps." : "No se pudo. Pega el link de Google Maps."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const usarLink = async () => {
    const t = link.trim(); if (!t) return;
    setOcupado(true); setEstado("Leyendo el link…");
    const c = await resolverLinkMapa(t);
    setOcupado(false);
    if (c) { setLat(c.lat); setLng(c.lng); setLink(""); setEstado("✅ ¡Ubicación tomada del link!"); }
    else setEstado("No pude leer ese link. Usa el botón de ubicación.");
  };

  const listo = lat != null && lng != null;

  return (
    <div className="rounded-xl border border-crema-2 bg-crema/40 p-3">
      <input type="hidden" name="lat" value={lat ?? ""} />
      <input type="hidden" name="lng" value={lng ?? ""} />
      <p className="text-xs font-bold text-tinta">{titulo}</p>
      <button type="button" onClick={gps} className="mt-2 w-full rounded-lg bg-azul py-2.5 text-sm font-bold text-white active:scale-95">
        📍 Compartir mi ubicación (GPS)
      </button>
      <div className="mt-2 flex gap-2">
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="…o pega el link de Google Maps"
          className="min-w-0 flex-1 rounded-lg border border-crema-2 bg-white px-3 py-2 text-sm outline-none focus:border-naranja" />
        <button type="button" onClick={usarLink} disabled={ocupado} className="shrink-0 rounded-lg bg-naranja px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Usar</button>
      </div>
      {estado && <p className="mt-1 text-[11px] font-semibold text-choco-2">{estado}</p>}
      {listo && <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener" className="mt-1 inline-block text-[11px] font-bold text-azul">ver en mapa ↗</a>}
    </div>
  );
}
