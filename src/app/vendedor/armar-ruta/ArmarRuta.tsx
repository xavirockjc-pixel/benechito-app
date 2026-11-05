"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Cliente = {
  id: string; nombre: string; comuna: string; rutaClave: string; rutaLabel: string;
  lat: number | null; lng: number | null; agendo: boolean; detalle: string | null;
};
type Ruta = { clave: string; label: string };

const FABRICA = { lat: -37.012556, lng: -73.155944 }; // Río Salado 963, Coronel

function distanciaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const fmtDist = (km: number) => (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);

/** Ordena por vecino más próximo partiendo de `origen`. */
function ordenarCercania<T extends { lat: number; lng: number }>(origen: { lat: number; lng: number }, pts: T[]) {
  const resto = [...pts];
  const out: (T & { dist: number })[] = [];
  let actual = origen;
  while (resto.length) {
    let mejor = 0, mejorD = Infinity;
    resto.forEach((p, i) => { const d = distanciaKm(actual, p); if (d < mejorD) { mejorD = d; mejor = i; } });
    const [p] = resto.splice(mejor, 1);
    out.push({ ...p, dist: mejorD });
    actual = { lat: p.lat, lng: p.lng };
  }
  return out;
}

/**
 * Arma la ruta del día: elige la ruta (Coronel, Lota…), decide a quién pasar
 * (todos / solo los que agendaron / agregar a mano) y ordena por ubicación.
 */
export default function ArmarRuta({ clientes, rutas }: { clientes: Cliente[]; rutas: Ruta[] }) {
  const [rutaSel, setRutaSel] = useState(rutas[0]?.clave ?? "");
  const nAgendo = useMemo(() => clientes.filter((c) => c.rutaClave === rutaSel && c.agendo).length, [clientes, rutaSel]);

  const clientesRuta = useMemo(
    () => clientes.filter((c) => c.rutaClave === rutaSel).sort((a, b) => Number(b.agendo) - Number(a.agendo) || a.nombre.localeCompare(b.nombre, "es")),
    [clientes, rutaSel],
  );

  // Selección de a quién pasar. Por defecto: los que agendaron (si hay), si no, todos.
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [tocado, setTocado] = useState(false);
  const seleccion = useMemo(() => {
    if (tocado) return sel;
    const base = clientesRuta.filter((c) => (nAgendo > 0 ? c.agendo : true)).map((c) => c.id);
    return new Set(base);
  }, [tocado, sel, clientesRuta, nAgendo]);

  const toggle = (id: string) => { const n = new Set(seleccion); n.has(id) ? n.delete(id) : n.add(id); setSel(n); setTocado(true); };
  const ponerTodos = () => { setSel(new Set(clientesRuta.map((c) => c.id))); setTocado(true); };
  const soloAgendaron = () => { setSel(new Set(clientesRuta.filter((c) => c.agendo).map((c) => c.id))); setTocado(true); };

  const cambiarRuta = (clave: string) => { setRutaSel(clave); setSel(new Set()); setTocado(false); setOrden(null); };

  // Cálculo de orden.
  const [orden, setOrden] = useState<(Cliente & { dist: number })[] | null>(null);
  const [origen, setOrigen] = useState<{ lat: number; lng: number } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const elegidos = clientesRuta.filter((c) => seleccion.has(c.id));
  const conCoord = elegidos.filter((c) => c.lat != null && c.lng != null) as (Cliente & { lat: number; lng: number })[];
  const sinCoord = elegidos.filter((c) => c.lat == null || c.lng == null);

  const calcular = (desde: { lat: number; lng: number }) => {
    setOrigen(desde);
    setOrden(ordenarCercania(desde, conCoord));
  };
  const calcularGPS = () => {
    if (conCoord.length === 0) { setAviso("Ninguno de los elegidos tiene ubicación guardada."); return; }
    setAviso(null);
    if (!("geolocation" in navigator)) { calcular(FABRICA); setAviso("Sin GPS: ordené desde la fábrica."); return; }
    setCargando(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { calcular({ lat: p.coords.latitude, lng: p.coords.longitude }); setCargando(false); },
      () => { calcular(FABRICA); setCargando(false); setAviso("No se pudo usar tu GPS: ordené desde la fábrica."); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const totalKm = orden ? orden.reduce((s, p) => s + p.dist, 0) : 0;
  const mapsUrl = origen && orden && orden.length
    ? `https://www.google.com/maps/dir/${origen.lat},${origen.lng}/` + orden.map((p) => `${p.lat},${p.lng}`).join("/")
    : "";

  return (
    <div className="space-y-4">
      {/* Elegir ruta */}
      <div className="flex flex-wrap gap-1.5">
        {rutas.map((r) => (
          <button key={r.clave} onClick={() => cambiarRuta(r.clave)}
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${rutaSel === r.clave ? "border-[#1479c4] bg-blue-50 text-[#1479c4]" : "border-slate-200 bg-white text-slate-500"}`}>
            📍 {r.label}
          </button>
        ))}
      </div>

      {/* Modo: todos / solo agendados */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={soloAgendaron} disabled={nAgendo === 0}
          className="rounded-xl border-2 border-[#0f766e] py-2.5 text-xs font-extrabold text-[#0f766e] disabled:opacity-30">
          📅 Solo los que agendaron ({nAgendo})
        </button>
        <button onClick={ponerTodos}
          className="rounded-xl border-2 border-[#1479c4] py-2.5 text-xs font-extrabold text-[#1479c4]">
          👥 Pasar por todos ({clientesRuta.length})
        </button>
      </div>

      {/* Lista con checkboxes (agregar/quitar a mano) */}
      {clientesRuta.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-400">Sin clientes en esta ruta.</p>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
            Marca a quién pasar · {seleccion.size} elegido(s)
          </p>
          <ul className="divide-y divide-slate-100">
            {clientesRuta.map((c) => {
              const on = seleccion.has(c.id);
              return (
                <li key={c.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 active:bg-slate-50">
                    <input type="checkbox" checked={on} onChange={() => toggle(c.id)} className="h-5 w-5 shrink-0 accent-[#1479c4]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {c.agendo && <span className="mr-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">📅 agendó</span>}
                        {c.nombre}
                      </span>
                      <span className="block truncate text-[11px] text-slate-400">
                        {c.comuna || "—"}{c.lat == null ? " · ⚠️ sin ubicación" : ""}
                      </span>
                      {c.agendo && c.detalle && <span className="mt-0.5 block whitespace-pre-line text-[11px] text-emerald-700">{c.detalle}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Calcular orden por ubicación */}
      <button onClick={calcularGPS} disabled={cargando || seleccion.size === 0}
        className="w-full rounded-xl bg-[#1479c4] py-3 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40">
        {cargando ? "Calculando…" : orden ? "🔄 Recalcular orden" : "🧭 Ordenar ruta por ubicación"}
      </button>
      {aviso && <p className="rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-700">{aviso}</p>}

      {/* Resultado ordenado */}
      {orden && orden.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="font-semibold text-slate-600">{orden.length} paradas · ~{totalKm.toFixed(1)} km</span>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-[#1479c4] underline">🗺️ Abrir en Maps</a>
          </div>
          <ol className="space-y-2">
            {orden.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1479c4] text-sm font-extrabold text-white">{i + 1}</span>
                <Link href={`/vendedor/cliente/${p.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-slate-900">{p.agendo ? "📅 " : ""}{p.nombre}</span>
                  <span className="block truncate text-xs text-slate-500">{fmtDist(p.dist)} · {p.comuna}</span>
                </Link>
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Ir</a>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Elegidos sin ubicación (no entran al orden, pero hay que pasar) */}
      {orden && sinCoord.length > 0 && (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/40 p-3">
          <p className="mb-1 text-xs font-bold text-amber-700">⚠️ {sinCoord.length} sin ubicación — no entran al orden, agrégales el GPS en su ficha:</p>
          <ul className="space-y-1">
            {sinCoord.map((c) => (
              <li key={c.id}><Link href={`/vendedor/cliente/${c.id}`} className="text-sm font-semibold text-slate-700 underline">{c.nombre}</Link> <span className="text-[11px] text-slate-400">· {c.comuna}</span></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
