"use client";

import { useRef, useState } from "react";
import { guardarUbicacionCliente } from "./actions";

/** Fija la ubicación del cliente = posición actual del vendedor (estando en el local). */
export default function GuardarUbicacionAqui({ negocioId }: { negocioId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fijar = () => {
    if (!("geolocation" in navigator)) {
      setError("Este dispositivo no tiene GPS.");
      return;
    }
    setCargando(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(String(p.coords.latitude));
        setLng(String(p.coords.longitude));
        // Espera al render de los valores y envía.
        requestAnimationFrame(() => formRef.current?.requestSubmit());
      },
      () => {
        setError("No se pudo obtener la ubicación.");
        setCargando(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <form ref={formRef} action={guardarUbicacionCliente}>
      <input type="hidden" name="negocioId" value={negocioId} />
      <input type="hidden" name="latitud" value={lat} />
      <input type="hidden" name="longitud" value={lng} />
      <button
        type="button"
        onClick={fijar}
        className="w-full rounded-xl border-2 border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-700 active:bg-slate-50"
      >
        {cargando ? "Guardando ubicación…" : "📍 Guardar la ubicación de este local"}
      </button>
      {error && <p className="mt-1 text-center text-xs text-red-600">{error}</p>}
    </form>
  );
}
