"use client";

import { useRef, useState } from "react";
import { parseCoords } from "@/lib/dominio/geo";
import { guardarUbicacionCliente } from "./actions";

/**
 * Fija la ubicación de un cliente existente. Dos formas:
 *  (1) GPS: estando parado en el local (captura y guarda solo).
 *  (2) Manual: pegando coordenadas o un enlace de Google Maps (sin estar ahí).
 */
export default function GuardarUbicacionAqui({ negocioId }: { negocioId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [manual, setManual] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = () => requestAnimationFrame(() => formRef.current?.requestSubmit());

  const fijarGPS = () => {
    if (!("geolocation" in navigator)) {
      setError("Sin GPS. Usa la opción manual.");
      setAbierto(true);
      return;
    }
    setCargando(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(String(p.coords.latitude));
        setLng(String(p.coords.longitude));
        enviar();
      },
      () => {
        setError("No se pudo obtener el GPS. Usa la opción manual.");
        setAbierto(true);
        setCargando(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const guardarManual = () => {
    const c = parseCoords(manual);
    if (!c) {
      setError("No reconocí esas coordenadas. Ej: -37.01256, -73.15594");
      return;
    }
    setError(null);
    setLat(String(c.lat));
    setLng(String(c.lng));
    enviar();
  };

  return (
    <form ref={formRef} action={guardarUbicacionCliente} className="space-y-2">
      <input type="hidden" name="negocioId" value={negocioId} />
      <input type="hidden" name="latitud" value={lat} />
      <input type="hidden" name="longitud" value={lng} />

      <button
        type="button"
        onClick={fijarGPS}
        className="w-full rounded-xl border-2 border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 active:bg-slate-50"
      >
        {cargando ? "Guardando ubicación…" : "📍 Guardar ubicación con GPS (estoy en el local)"}
      </button>

      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="w-full text-center text-xs font-semibold text-slate-500 underline"
      >
        …o ingresar la ubicación a mano
      </button>

      {abierto && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            inputMode="text"
            placeholder="Pega coordenadas o enlace de Google Maps"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1479c4]"
          />
          <p className="mt-1 text-[11px] leading-tight text-slate-400">
            Ej: <span className="font-mono">-37.01256, -73.15594</span>. En Google Maps mantén presionado el lugar → toca las coordenadas para copiarlas.
          </p>
          <button
            type="button"
            onClick={guardarManual}
            className="mt-2 w-full rounded-lg bg-[#1479c4] py-2.5 text-sm font-bold text-white active:brightness-95"
          >
            Guardar ubicación
          </button>
        </div>
      )}

      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </form>
  );
}
