"use client";

import { useEffect, useRef, useState } from "react";
import { registrarVentaDictada } from "../actions";
import { parsearVentaDictada, type LineaVenta } from "@/lib/dominio/reparto";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};
const fmtCLP = (n: number) => "$" + n.toLocaleString("es-CL");

/** Calculadora de ventas especiales por dictado: "200 tú y yo a 270", "200 a 13.500 la bolsa de 50". */
export default function VentaDictada({ clientes = [] }: { clientes?: string[] }) {
  const [raw, setRaw] = useState("");
  const [cliente, setCliente] = useState("");
  const [lineas, setLineas] = useState<LineaVenta[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    recRef.current = rec;
  }, []);

  function analizar(txt: string) {
    const { lineas: ls } = parsearVentaDictada(txt);
    if (ls.length) setLineas((prev) => [...prev, ...ls]);
  }
  function dictar() {
    const rec = recRef.current;
    if (!rec || escuchando) return;
    rec.onresult = (e) => { const t = e.results[0][0].transcript; setRaw((p) => (p ? p + "\n" : "") + t); analizar(t); };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  }

  const setLinea = (i: number, patch: Partial<LineaVenta>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const quitar = (i: number) => setLineas((ls) => ls.filter((_, j) => j !== i));
  const total = lineas.reduce((s, l) => s + l.cantidad * l.precioUnit, 0);

  async function guardar() {
    if (lineas.length === 0 || guardando) return;
    setGuardando(true);
    const fd = new FormData();
    fd.set("cliente", cliente.trim());
    fd.set("lineas", JSON.stringify(lineas));
    try { await registrarVentaDictada(fd); setOk(true); } finally { setGuardando(false); }
  }

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm">
      <p className="text-sm font-extrabold text-indigo-900">🧮 Venta especial (dictado)</p>
      <p className="mt-0.5 text-[11px] text-indigo-700">Dicta libre: “200 tú y yo a 270”, o “200 a 13.500 la bolsa de 50”. Se calcula solo y queda como venta.</p>

      <div className="mt-2 flex gap-2">
        <textarea value={raw} onChange={(e) => setRaw(e.target.value)} rows={2} placeholder="Ej: 200 tú y yo a 270, 10 trufas a 500"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        {soportado && (
          <button type="button" onClick={dictar} className={`shrink-0 rounded-xl px-3 text-xl ${escuchando ? "animate-pulse bg-rose-500 text-white" : "bg-indigo-200 text-indigo-800"}`} aria-label="Dictar">🎤</button>
        )}
      </div>
      <button type="button" onClick={() => analizar(raw)} disabled={!raw.trim()}
        className="mt-2 w-full rounded-xl bg-indigo-700 py-2 text-sm font-bold text-white disabled:opacity-40">🔎 Agregar a la venta</button>

      {lineas.length > 0 && (
        <div className="mt-3 space-y-2">
          {lineas.map((l, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg bg-white p-2">
              <input value={l.cantidad || ""} onChange={(e) => setLinea(i, { cantidad: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 })} inputMode="numeric" className="w-14 rounded border border-slate-300 px-2 py-1.5 text-right text-sm font-semibold" />
              <input value={l.producto} onChange={(e) => setLinea(i, { producto: e.target.value })} className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1.5 text-sm" />
              <span className="text-slate-400">$</span>
              <input value={l.precioUnit || ""} onChange={(e) => setLinea(i, { precioUnit: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 })} inputMode="numeric" placeholder="auto" className="w-20 rounded border border-slate-300 px-2 py-1.5 text-right text-sm" />
              <button type="button" onClick={() => quitar(i)} className="px-1 text-rose-500" aria-label="Quitar">✕</button>
            </div>
          ))}
          <p className="text-right text-[11px] text-slate-400">Precio “auto” = según sector y cantidad del cliente (si está configurado).</p>

          <input value={cliente} onChange={(e) => setCliente(e.target.value)} list="clientes-venta" placeholder="Cliente (negocio o nombre)"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <datalist id="clientes-venta">{clientes.map((c) => <option key={c} value={c} />)}</datalist>

          <div className="flex items-center justify-between rounded-xl bg-indigo-700 px-4 py-2 text-white">
            <span className="text-sm font-bold">Total: {fmtCLP(total)}</span>
            <button type="button" onClick={guardar} disabled={guardando} className="rounded-lg bg-white px-3 py-1.5 text-sm font-extrabold text-indigo-700 disabled:opacity-50">
              {ok ? "✓ Venta creada" : guardando ? "Guardando…" : "Registrar venta"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
