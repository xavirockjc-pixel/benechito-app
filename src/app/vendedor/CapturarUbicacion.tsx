"use client";

import { useState } from "react";
import { parseCoords } from "@/lib/dominio/geo";

/**
 * Deja la ubicación en inputs ocultos (latitud/longitud) del formulario padre.
 * Dos formas: (1) usar el GPS del teléfono, o (2) ingresarla a mano pegando
 * las coordenadas o un enlace de Google Maps.
 */
export default function CapturarUbicacion() {
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [origen, setOrigen] = useState<"gps" | "manual" | null>(null);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const capturarGPS = () => {
    if (!("geolocation" in navigator)) {
      setError("Este dispositivo no tiene GPS. Ingresa la ubicación a mano abajo.");
      return;
    }
    setCargando(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        setOrigen("gps");
        setCargando(false);
      },
      () => {
        setError("No se pudo obtener el GPS. Puedes ingresarla a mano abajo.");
        setCargando(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const usarManual = (texto: string) => {
    setManual(texto);
    const c = parseCoords(texto);
    if (c) {
      setPos(c);
      setOrigen("manual");
      setError(null);
    } else if (texto.trim() !== "") {
      setPos((p) => (origen === "manual" ? null : p));
      if (origen === "manual") setOrigen(null);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <input type="hidden" name="latitud" value={pos?.lat ?? ""} />
      <input type="hidden" name="longitud" value={pos?.lng ?? ""} />

      <button
        type="button"
        onClick={capturarGPS}
        className="w-full rounded-lg bg-slate-800 py-2.5 text-sm font-bold text-white active:brightness-95"
      >
        {cargando ? "Ubicando…" : pos && origen === "gps" ? "📍 Ubicación por GPS ✓ (tocar para actualizar)" : "📍 Usar mi ubicación actual (GPS)"}
      </button>

      <div className="pt-1">
        <p className="text-xs font-semibold text-slate-600">…o ingrésala a mano:</p>
        <input
          value={manual}
          onChange={(e) => usarManual(e.target.value)}
          inputMode="text"
          placeholder="Pega coordenadas o enlace de Google Maps"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1479c4]"
        />
        <p className="mt-1 text-[11px] leading-tight text-slate-400">
          Ej: <span className="font-mono">-37.01256, -73.15594</span>. En Google Maps mantén presionado el lugar → toca las coordenadas para copiarlas.
        </p>
      </div>

      {pos && (
        <p className="text-center text-xs font-semibold text-green-600">
          ✓ Ubicación lista: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} {origen === "manual" ? "(manual)" : ""}
        </p>
      )}
      {manual.trim() !== "" && !pos && (
        <p className="text-center text-xs text-amber-600">No reconocí esas coordenadas. Revisa que sean dos números, ej: -37.01, -73.15</p>
      )}
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
