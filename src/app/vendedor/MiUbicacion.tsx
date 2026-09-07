"use client";

import { useEffect, useRef, useState } from "react";
import { reportarUbicacion } from "./actions";

/** GPS del vendedor: sigue la posición en vivo y la reporta a la central (throttle ~45s). */
export default function MiUbicacion() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [estado, setEstado] = useState<"" | "compartiendo" | "sin-permiso" | "sin-gps">("");
  const lastSent = useRef(0);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) { setEstado("sin-gps"); return; }
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const lat = p.coords.latitude, lng = p.coords.longitude;
        setPos({ lat, lng });
        setEstado("compartiendo");
        const now = Date.now();
        if (now - lastSent.current > 45000) { // reporta como máximo cada 45s
          lastSent.current = now;
          reportarUbicacion(lat, lng).catch(() => {});
        }
      },
      () => setEstado("sin-permiso"),
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 },
    );
    return () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); };
  }, []);

  function reportarYa() {
    if (pos) { lastSent.current = Date.now(); reportarUbicacion(pos.lat, pos.lng).catch(() => {}); }
  }

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
      <button type="button" onClick={reportarYa} className="font-semibold text-[#1479c4]">
        {estado === "compartiendo" ? "🛰️ GPS activo — compartiendo" : "📍 Activar mi ubicación"}
      </button>
      {pos ? (
        <a href={`https://www.google.com/maps?q=${pos.lat},${pos.lng}`} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-slate-500 underline">Ver en mapa</a>
      ) : estado === "sin-permiso" ? (
        <span className="text-xs text-amber-600">Activa el permiso de ubicación</span>
      ) : estado === "sin-gps" ? (
        <span className="text-xs text-red-500">Sin GPS</span>
      ) : (
        <span className="text-xs text-slate-400">buscando señal…</span>
      )}
    </div>
  );
}
