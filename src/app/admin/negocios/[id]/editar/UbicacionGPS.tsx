"use client";

import { useState } from "react";

/**
 * Captura o corrige la ubicación GPS del cliente. Se puede agregar después:
 * botón para tomar la ubicación actual (desde el celular, en terreno) o
 * escribir/corregir las coordenadas a mano. Envía `latitud` y `longitud` con el form.
 */
export default function UbicacionGPS({ defaultLat, defaultLng }: { defaultLat: number | null; defaultLng: number | null }) {
  const [lat, setLat] = useState(defaultLat != null ? String(defaultLat) : "");
  const [lng, setLng] = useState(defaultLng != null ? String(defaultLng) : "");
  const [estado, setEstado] = useState("");
  const [cargando, setCargando] = useState(false);

  const capturar = () => {
    if (!("geolocation" in navigator)) { setEstado("Este dispositivo no permite ubicación."); return; }
    setCargando(true); setEstado("Obteniendo ubicación…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setEstado("✅ Ubicación capturada. Recuerda Guardar cambios.");
        setCargando(false);
      },
      (err) => {
        setEstado(err.code === 1 ? "Permiso de ubicación denegado." : "No se pudo obtener la ubicación.");
        setCargando(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const tieneCoords = lat.trim() && lng.trim();
  const inputCls = "mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30";

  return (
    <div className="mt-4 rounded-xl border border-crema-2 bg-crema/30 p-4">
      <p className="text-sm font-bold text-navy">📍 Ubicación GPS <span className="font-normal text-choco-2">(para la ruta y el mapa)</span></p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" onClick={capturar} disabled={cargando}
          className="rounded-full bg-navy px-4 py-2 text-sm font-bold text-white active:scale-95 disabled:opacity-50">
          📍 {cargando ? "Capturando…" : "Capturar mi ubicación aquí"}
        </button>
        {tieneCoords && (
          <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener"
            className="text-sm font-semibold text-naranja">Ver en mapa ↗</a>
        )}
      </div>
      {estado && <p className="mt-2 text-xs text-choco-2">{estado}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-navy">Latitud
          <input name="latitud" value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" placeholder="-36.826" className={inputCls} />
        </label>
        <label className="text-xs font-bold text-navy">Longitud
          <input name="longitud" value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" placeholder="-73.049" className={inputCls} />
        </label>
      </div>
      <p className="mt-1 text-[11px] text-choco-2">Tip: abre esta ficha desde el celular, parado en el local, y toca “Capturar”. También puedes pegar coordenadas de Google Maps.</p>
    </div>
  );
}
