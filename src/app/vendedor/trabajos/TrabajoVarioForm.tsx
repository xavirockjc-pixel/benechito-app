"use client";

import { useEffect, useRef, useState } from "react";
import { registrarTrabajoVario } from "../actions";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

const TIPOS: { id: string; label: string; icono: string }[] = [
  { id: "flete", label: "Flete", icono: "🚚" },
  { id: "arreglo", label: "Arreglo", icono: "🔧" },
  { id: "compra", label: "Compra", icono: "🛒" },
  { id: "busqueda", label: "Búsqueda", icono: "🔎" },
  { id: "mantencion", label: "Mantención", icono: "🧰" },
  { id: "otro", label: "Otro", icono: "📌" },
];

/** Anota un trabajo vario del turno (voz o escrito), con tipo y monto opcional. */
export default function TrabajoVarioForm() {
  const [tipo, setTipo] = useState("flete");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
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

  function dictar() {
    const rec = recRef.current;
    if (!rec || escuchando) return;
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setDescripcion((p) => (p ? p + " " : "") + t);
      const low = t.toLowerCase();
      const m = TIPOS.find((x) => low.includes(x.id) || (x.id === "busqueda" && /buscar|busqu/.test(low)) || (x.id === "mantencion" && /manten/.test(low)));
      if (m) setTipo(m.id);
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  }

  async function guardar() {
    if (!descripcion.trim() || guardando) return;
    setGuardando(true);
    const fd = new FormData();
    fd.set("tipo", tipo);
    fd.set("descripcion", descripcion.trim());
    fd.set("monto", String(Number(monto.replace(/[^0-9]/g, "")) || 0));
    try {
      await registrarTrabajoVario(fd);
      setOk(true); setDescripcion(""); setMonto("");
      setTimeout(() => setOk(false), 1500);
    } finally { setGuardando(false); }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap gap-1.5">
        {TIPOS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTipo(t.id)}
            className={`rounded-full border px-2.5 py-1 text-xs font-bold ${tipo === t.id ? "border-[#1479c4] bg-[#1479c4] text-white" : "border-slate-300 bg-white text-slate-600"}`}>
            {t.icono} {t.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
          placeholder="¿Qué hiciste? Ej: flete a don Juan, compré bolsas, arreglé la vitrina…"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        {soportado && (
          <button type="button" onClick={dictar}
            className={`shrink-0 rounded-xl px-3 text-xl ${escuchando ? "animate-pulse bg-rose-500 text-white" : "bg-slate-100 text-slate-700"}`} aria-label="Dictar">🎤</button>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="flex items-center gap-1 text-xs font-bold text-slate-600">💵 Costo/cobro (opcional)
          <span className="flex items-center rounded-lg border border-slate-300 bg-white px-2">
            <span className="text-slate-400">$</span>
            <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="numeric" placeholder="0"
              className="w-24 px-1 py-1.5 text-right text-sm font-semibold outline-none" />
          </span>
        </label>
        <button type="button" onClick={guardar} disabled={!descripcion.trim() || guardando}
          className="rounded-xl bg-[#1479c4] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">
          {ok ? "✓ Guardado" : guardando ? "Guardando…" : "Anotar"}
        </button>
      </div>
    </div>
  );
}
