"use client";

import { useEffect, useState } from "react";
import { linkMaps } from "@/lib/dominio/reparto";
import { moverPedidoReparto, entregarPedidoReparto, pagoPedidoReparto, borrarPedidoReparto, ordenarRutaCercania } from "../actions";

type Pedido = {
  id: string; cliente: string | null; telefono: string | null; pedido: string;
  monto: number | null; estadoPago: string; lat: number | null; lng: number | null; mapsUrl: string | null;
};

const fmtCLP = (n: number) => "$" + n.toLocaleString("es-CL");

function sumaMin(base: Date, min: number) {
  const d = new Date(base.getTime() + min * 60000);
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

export default function RutaReparto({ pedidos }: { pedidos: Pedido[] }) {
  const [minPorParada, setMin] = useState(12);
  const [salida, setSalida] = useState(""); // HH:MM; vacío = ahora
  const [ordenando, setOrdenando] = useState(false);

  useEffect(() => {
    try {
      const m = localStorage.getItem("reparto-min");
      const s = localStorage.getItem("reparto-salida");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (m) setMin(Number(m) || 12);
      if (s) setSalida(s);
    } catch { /* */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("reparto-min", String(minPorParada)); } catch { /* */ } }, [minPorParada]);
  useEffect(() => { try { localStorage.setItem("reparto-salida", salida); } catch { /* */ } }, [salida]);

  const base = (() => {
    if (salida && /^\d{1,2}:\d{2}$/.test(salida)) {
      const [h, m] = salida.split(":").map(Number);
      const d = new Date(); d.setHours(h, m, 0, 0); return d;
    }
    return new Date();
  })();

  const call = (fn: (fd: FormData) => Promise<void> | void, data: Record<string, string>) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.set(k, v));
    return fn(fd);
  };

  async function ordenarCercania() {
    if (ordenando) return;
    setOrdenando(true);
    const finish = (lat?: number, lng?: number) => {
      const d: Record<string, string> = {};
      if (lat != null && lng != null) { d.olat = String(lat); d.olng = String(lng); }
      Promise.resolve(call(ordenarRutaCercania, d)).finally(() => setOrdenando(false));
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => finish(pos.coords.latitude, pos.coords.longitude),
        () => finish(),
        { timeout: 6000 },
      );
    } else finish();
  }

  function avisar(p: Pedido, pos: number) {
    const eta = sumaMin(base, (pos - 1) * minPorParada);
    const hola = p.cliente ? `Hola ${p.cliente}! ` : "Hola! ";
    const msg = `${hola}👋 Tu pedido de Benechito va en camino 🛵\nVas en el lugar N° ${pos} de la ruta.\nLlegada estimada: ~${eta} hrs.\n¡Gracias por tu compra! 🍦`;
    const tel = (p.telefono ?? "").replace(/\D/g, "");
    const url = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  }

  if (pedidos.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No hay pedidos en la ruta de hoy.</p>;
  }

  return (
    <div className="space-y-3">
      {/* Config ETA + ordenar */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <label className="text-xs font-bold text-slate-600">Salida
          <input value={salida} onChange={(e) => setSalida(e.target.value)} placeholder="ahora" className="ml-1 w-16 rounded border border-slate-300 px-2 py-1 text-sm" />
        </label>
        <label className="text-xs font-bold text-slate-600">Min/parada
          <input value={minPorParada} onChange={(e) => setMin(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)} inputMode="numeric" className="ml-1 w-14 rounded border border-slate-300 px-2 py-1 text-right text-sm" />
        </label>
        <button type="button" onClick={ordenarCercania} disabled={ordenando}
          className="ml-auto rounded-lg bg-[#1479c4] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          {ordenando ? "Ordenando…" : "📍 Ordenar por cercanía"}
        </button>
      </div>

      <ol className="space-y-2">
        {pedidos.map((p, i) => {
          const pos = i + 1;
          const eta = sumaMin(base, i * minPorParada);
          const maps = linkMaps(p);
          return (
            <li key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#1479c4] text-sm font-extrabold text-white">{pos}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900">{p.cliente || "Cliente"} <span className="font-normal text-slate-400">· ~{eta}</span></p>
                  <p className="text-xs text-slate-600">{p.pedido}</p>
                  <p className="text-[11px] text-slate-400">
                    {p.monto ? fmtCLP(Number(p.monto)) : "sin monto"} · {p.estadoPago === "pagado" ? "✅ pagado" : "⏳ por cobrar"}
                    {p.lat == null && !p.mapsUrl ? " · ⚠️ sin ubicación" : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button type="button" onClick={() => call(moverPedidoReparto, { id: p.id, dir: "up" })} className="rounded bg-slate-100 px-2 text-xs font-bold text-slate-600">↑</button>
                  <button type="button" onClick={() => call(moverPedidoReparto, { id: p.id, dir: "down" })} className="rounded bg-slate-100 px-2 text-xs font-bold text-slate-600">↓</button>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {maps && <a href={maps} target="_blank" rel="noreferrer" className="rounded-lg bg-slate-100 py-2 text-center text-xs font-bold text-slate-700">🗺️ Ir</a>}
                <button type="button" onClick={() => avisar(p, pos)} className="rounded-lg bg-green-600 py-2 text-xs font-bold text-white">💬 Avisar</button>
                <button type="button" onClick={() => call(pagoPedidoReparto, { id: p.id, estadoPago: p.estadoPago === "pagado" ? "por_cobrar" : "pagado" })}
                  className="rounded-lg border border-slate-300 py-2 text-xs font-bold text-slate-600">{p.estadoPago === "pagado" ? "Marcar por cobrar" : "Marcar pagado"}</button>
                <button type="button" onClick={() => call(entregarPedidoReparto, { id: p.id })} className="rounded-lg bg-[#0f766e] py-2 text-xs font-bold text-white">✅ Entregado</button>
              </div>
              <button type="button" onClick={() => call(borrarPedidoReparto, { id: p.id })} className="mt-1 w-full text-[11px] font-semibold text-rose-400">Borrar</button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
