"use client";

import { useState } from "react";

/** Botón que captura la ubicación GPS y la deja en inputs ocultos del formulario padre. */
export default function CapturarUbicacion() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const capturar = () => {
    if (!("geolocation" in navigator)) {
      setError("Este dispositivo no tiene GPS.");
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
        setError("No se pudo obtener la ubicación (¿permiso denegado?).");
        setCargando(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="latitud" value={pos?.lat ?? ""} />
      <input type="hidden" name="longitud" value={pos?.lng ?? ""} />
      <button
        type="button"
        onClick={capturar}
        className="w-full rounded-lg bg-slate-800 py-2.5 text-sm font-bold text-white active:brightness-95"
      >
        {cargando ? "Ubicando…" : pos ? "📍 Ubicación capturada ✓ (tocar para actualizar)" : "📍 Usar mi ubicación actual"}
      </button>
      {pos && (
        <p className="mt-2 text-center text-xs text-slate-500">
          {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
        </p>
      )}
      {error && <p className="mt-2 text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
