"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

/**
 * Ubicación en un MAPA real (Leaflet + OpenStreetMap, sin llave de Google).
 * - Buscar la dirección o el nombre del local → el mapa salta y pone el punto.
 * - Tocar/arrastrar el punto en el mapa.
 * - "Mi ubicación" (GPS del celular).
 * Las coordenadas se escriben SOLAS en campos ocultos (latitud/longitud) que envía el form.
 */
export default function UbicacionMapa({ defaultLat, defaultLng }: { defaultLat: number | null; defaultLng: number | null }) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [lat, setLat] = useState<number | null>(defaultLat);
  const [lng, setLng] = useState<number | null>(defaultLng);
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !divRef.current || mapRef.current) return;
      const inicio: [number, number] = defaultLat != null && defaultLng != null ? [defaultLat, defaultLng] : [-36.83, -73.05];
      const zoom = defaultLat != null ? 16 : 12;
      const map = L.map(divRef.current).setView(inicio, zoom);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "© OpenStreetMap",
      }).addTo(map);
      const icon = L.divIcon({ html: '<div style="font-size:30px;line-height:1">📍</div>', className: "", iconSize: [30, 30], iconAnchor: [15, 30] });
      const marker = L.marker(inicio, { draggable: true, icon }).addTo(map);
      marker.on("dragend", () => { const p = marker.getLatLng(); fijar(p.lat, p.lng); });
      map.on("click", (e: any) => { marker.setLatLng(e.latlng); fijar(e.latlng.lat, e.latlng.lng); });
      mapRef.current = map; markerRef.current = marker;
      // Corrige el tamaño cuando el contenedor ya está pintado.
      setTimeout(() => map.invalidateSize(), 200);
    })();
    return () => { cancelado = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fijar = (la: number, ln: number) => {
    setLat(Number(la.toFixed(6))); setLng(Number(ln.toFixed(6))); setEstado("");
  };
  const mover = (la: number, ln: number, zoom = 16) => {
    if (mapRef.current && markerRef.current) { mapRef.current.setView([la, ln], zoom); markerRef.current.setLatLng([la, ln]); }
    fijar(la, ln);
  };

  const buscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const texto = q.trim();
    if (!texto) return;
    setBuscando(true); setEstado("Buscando…");
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=cl&q=${encodeURIComponent(texto)}`, {
        headers: { "Accept-Language": "es" },
      });
      const data = await r.json();
      if (Array.isArray(data) && data[0]) { mover(Number(data[0].lat), Number(data[0].lon)); setEstado("✅ Punto puesto. Ajústalo tocando el mapa si hace falta."); }
      else setEstado("No encontré ese lugar. Prueba con la calle y comuna, o tócalo en el mapa.");
    } catch { setEstado("No se pudo buscar. Toca el punto en el mapa o usa Mi ubicación."); }
    setBuscando(false);
  };

  const miUbicacion = () => {
    if (!("geolocation" in navigator)) { setEstado("Este dispositivo no permite ubicación."); return; }
    setEstado("Obteniendo tu ubicación…");
    navigator.geolocation.getCurrentPosition(
      (p) => { mover(p.coords.latitude, p.coords.longitude, 17); setEstado("✅ Ubicación tomada."); },
      (err) => setEstado(err.code === 1 ? "Permiso de ubicación denegado." : "No se pudo obtener la ubicación."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const inputCls = "w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30";

  return (
    <div className="mt-4 rounded-xl border border-crema-2 bg-crema/30 p-4">
      <p className="text-sm font-bold text-navy">📍 Ubicación en el mapa <span className="font-normal text-choco-2">(para la ruta)</span></p>

      {/* Buscar */}
      <div className="mt-2 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar dirección o local… (ej: Los Aromos 123, Coronel)"
          className={inputCls} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); buscar(e); } }} />
        <button type="button" onClick={buscar} disabled={buscando} className="shrink-0 rounded-xl bg-naranja px-4 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-50">
          {buscando ? "…" : "Buscar"}
        </button>
      </div>
      <button type="button" onClick={miUbicacion} className="mt-2 rounded-full bg-navy px-4 py-2 text-sm font-bold text-white active:scale-95">
        📍 Usar mi ubicación (GPS)
      </button>

      {/* Mapa */}
      <div ref={divRef} className="mt-3 h-64 w-full overflow-hidden rounded-xl border border-crema-2" style={{ minHeight: 256 }} />

      {estado && <p className="mt-2 text-xs text-choco-2">{estado}</p>}
      <p className="mt-1 text-xs text-choco-2">
        {lat != null && lng != null
          ? <>✅ Ubicación lista · <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener" className="font-semibold text-naranja">ver en Google Maps ↗</a> · recuerda <b>Guardar cambios</b>.</>
          : "Busca la dirección, toca el mapa o usa tu GPS. Se guarda solo."}
      </p>

      {/* Coordenadas ocultas (se llenan solas — sin doble trabajo) */}
      <input type="hidden" name="latitud" value={lat ?? ""} />
      <input type="hidden" name="longitud" value={lng ?? ""} />
    </div>
  );
}
