"use client";

import { useState } from "react";

/**
 * Elegir cómo se entrega un delivery: lo entrego YO (moto propia) o lo DERIVO a
 * una moto externa (Uber Direct / PedidosYa) que viene a buscarlo al local. Al
 * derivar, deja los datos del envío listos para copiar y pedirlo en su app, y
 * guarda el courier y el costo del servicio (sin comisión, solo el reparto).
 */
const COURIERS = [
  { v: "uber", t: "Uber Direct" },
  { v: "pedidosya", t: "PedidosYa" },
  { v: "otro", t: "Otro" },
];

export default function DerivarReparto({
  id, repartoPor, courier, costoReparto, envio, mapsUrl, accion,
}: {
  id: string;
  repartoPor?: string | null;
  courier?: string | null;
  costoReparto?: number | null;
  envio: string;
  mapsUrl?: string | null;
  accion: (fd: FormData) => void | Promise<void>;
}) {
  const [externo, setExterno] = useState(repartoPor === "externo");
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try { await navigator.clipboard.writeText(envio); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* ignore */ }
  };

  return (
    <div className="mt-2 rounded-lg bg-slate-50 p-2">
      <div className="flex gap-1.5">
        <form action={accion} className="flex-1">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="repartoPor" value="local" />
          <button onClick={() => setExterno(false)}
            className={`w-full rounded-lg px-2 py-1.5 text-xs font-bold ${repartoPor !== "externo" ? "bg-[#0f766e] text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
            🛵 Entrego yo
          </button>
        </form>
        <button type="button" onClick={() => setExterno(true)}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-bold ${externo ? "bg-[#6b3f1d] text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"}`}>
          🏍️ Moto externa
        </button>
      </div>

      {externo && (
        <form action={accion} className="mt-2 space-y-1.5">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="repartoPor" value="externo" />
          <div className="flex gap-1.5">
            <select name="courier" defaultValue={courier ?? "uber"} className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs">
              {COURIERS.map((c) => <option key={c.v} value={c.v}>{c.t}</option>)}
            </select>
            <input name="costoReparto" inputMode="numeric" defaultValue={costoReparto ?? ""} placeholder="$ envío"
              className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs" />
            <button className="rounded-lg bg-[#6b3f1d] px-2.5 py-1.5 text-xs font-extrabold text-white">Guardar</button>
          </div>
          <button type="button" onClick={copiar} className="w-full rounded-lg bg-white px-2 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
            {copiado ? "✓ Copiado — pégalo en la app del courier" : "📋 Copiar datos del envío"}
          </button>
          {mapsUrl && <a href={mapsUrl} target="_blank" rel="noreferrer" className="block text-center text-[11px] font-bold text-sky-600">📍 destino ↗</a>}
        </form>
      )}

      {repartoPor === "externo" && (
        <p className="mt-1 text-[11px] font-semibold text-[#6b3f1d]">
          🏍️ Derivado a moto externa{courier ? ` · ${courier}` : ""}{costoReparto ? ` · envío $${Number(costoReparto).toLocaleString("es-CL")}` : ""}
        </p>
      )}
    </div>
  );
}
