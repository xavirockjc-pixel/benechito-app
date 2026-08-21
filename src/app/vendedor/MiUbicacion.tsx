"use client";

import { useState } from "react";

/** Muestra dónde está el vendedor y un enlace para verlo en el mapa. */
export default function MiUbicacion() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ubicar = () => {
    if (!("geolocation" in navigator)) {
      setError("Sin GPS");
      return;
    }
    setCargando(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setCargando(false);
      },
      () => {
        setError("Sin permiso de ubicación");
        setCargando(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
      <button type="button" onClick={ubicar} className="font-semibold text-[#1479c4]">
        {cargando ? "Ubicando…" : "📍 ¿Dónde estoy?"}
      </button>
      {pos && (
        <a
          href={`https://www.google.com/maps?q=${pos.lat},${pos.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-slate-500 underline"
        >
          Ver en mapa
        </a>
      )}
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}
