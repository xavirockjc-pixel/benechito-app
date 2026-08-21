"use client";

import { useState } from "react";
import Link from "next/link";
import { fmtCLP } from "@/lib/dominio/pedidos";

type Cliente = {
  id: string;
  nombre: string;
  direccion: string | null;
  comuna: string;
  lat: number;
  lng: number;
  saldo: number;
};
type Parada = Cliente & { dist: number };

/** Distancia en km entre dos coordenadas (fórmula de Haversine). */
function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Ordena por vecino más próximo, partiendo desde `origen`. */
function ordenarPorCercania(origen: { lat: number; lng: number }, puntos: Cliente[]): Parada[] {
  const resto = [...puntos];
  const orden: Parada[] = [];
  let actual = origen;
  while (resto.length) {
    let mejor = 0;
    let mejorDist = Infinity;
    resto.forEach((p, i) => {
      const d = distanciaKm(actual, p);
      if (d < mejorDist) {
        mejorDist = d;
        mejor = i;
      }
    });
    const [p] = resto.splice(mejor, 1);
    orden.push({ ...p, dist: mejorDist });
    actual = { lat: p.lat, lng: p.lng };
  }
  return orden;
}

const fmtDist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

export default function RutaSugerida({ clientes }: { clientes: Cliente[] }) {
  const [origen, setOrigen] = useState<{ lat: number; lng: number } | null>(null);
  const [orden, setOrden] = useState<Parada[] | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calcular = () => {
    if (!("geolocation" in navigator)) {
      setError("Este dispositivo no tiene GPS.");
      return;
    }
    setCargando(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const o = { lat: p.coords.latitude, lng: p.coords.longitude };
        setOrigen(o);
        setOrden(ordenarPorCercania(o, clientes));
        setCargando(false);
      },
      () => {
        setError("No se pudo obtener tu ubicación (¿permiso denegado?).");
        setCargando(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  if (clientes.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        Aún no hay clientes con ubicación. Agrégala en la ficha de cada cliente para armar la ruta.
      </p>
    );
  }

  const totalKm = orden ? orden.reduce((s, p) => s + p.dist, 0) : 0;
  const mapsUrl =
    origen && orden
      ? `https://www.google.com/maps/dir/${origen.lat},${origen.lng}/` +
        orden.map((p) => `${p.lat},${p.lng}`).join("/")
      : "";

  return (
    <div>
      <button
        onClick={calcular}
        className="w-full rounded-xl bg-[#1479c4] py-3 text-base font-extrabold text-white shadow active:brightness-95"
      >
        {cargando ? "Calculando…" : orden ? "🔄 Recalcular ruta" : "📍 Calcular mi ruta"}
      </button>
      {error && <p className="mt-2 text-center text-sm text-red-600">{error}</p>}

      {orden && (
        <>
          <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="font-semibold text-slate-600">{orden.length} paradas · ~{totalKm.toFixed(1)} km</span>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-[#1479c4] underline">
              🗺️ Abrir ruta en Maps
            </a>
          </div>

          <ol className="mt-3 space-y-2">
            {orden.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1479c4] text-sm font-extrabold text-white">
                  {i + 1}
                </span>
                <Link href={`/vendedor/cliente/${p.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-slate-900">{p.nombre}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {fmtDist(p.dist)} · {p.direccion || p.comuna}
                  </span>
                  {p.saldo > 0 && (
                    <span className="text-xs font-bold text-red-600">Debe {fmtCLP(p.saldo)}</span>
                  )}
                </Link>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700"
                >
                  Ir
                </a>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
