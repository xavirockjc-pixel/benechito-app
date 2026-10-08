"use client";

import { useEffect, useRef, useState } from "react";
import { crearPendienteProd } from "./actions";
import { PRIORIDADES, prioridadLabel } from "@/lib/dominio/mejoras";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

/** Caja para anotar un pendiente/mejora desde el tablet, por voz o escrito. */
export default function PendienteVoz() {
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [prioridad, setPrioridad] = useState("media");
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setTitulo((prev) => (prev ? prev + " " : "") + t);
      if (/\b(urgente|importante|ya|hoy|se acaba|parad[ao]|no funciona|roto|malo)\b/i.test(t)) setPrioridad("alta");
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    recRef.current = rec;
  }, []);

  function dictar() {
    if (!recRef.current || escuchando) return;
    try { recRef.current.start(); setEscuchando(true); } catch { /* ya activo */ }
  }

  async function guardar() {
    if (!titulo.trim() || guardando) return;
    setGuardando(true);
    const fd = new FormData();
    fd.set("titulo", titulo.trim());
    fd.set("prioridad", prioridad);
    try {
      await crearPendienteProd(fd);
      setOk(true);
      setTitulo(""); setPrioridad("media");
      setTimeout(() => setOk(false), 1600);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
      <p className="text-sm font-bold text-amber-900">➕ Anota algo que falta o una mejora</p>
      <p className="mt-0.5 text-[11px] text-amber-700">Dícta o escribe. Le llega al socio para que no se olvide.</p>
      <div className="mt-3 flex gap-2">
        <textarea
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ej: falta esencia de frutilla, la selladora gotea…"
          rows={2}
          className="min-w-0 flex-1 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm text-slate-800"
        />
        {soportado && (
          <button
            type="button"
            onClick={dictar}
            className={`shrink-0 rounded-xl px-3 text-xl ${escuchando ? "animate-pulse bg-rose-500 text-white" : "bg-amber-200 text-amber-800"}`}
            aria-label="Dictar"
          >
            🎤
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex gap-1">
          {PRIORIDADES.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPrioridad(p)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${prioridad === p ? "border-amber-500 bg-amber-500 text-white" : "border-amber-300 bg-white text-amber-700"}`}
            >
              {prioridadLabel[p]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={guardar}
          disabled={!titulo.trim() || guardando}
          className="rounded-xl bg-[#0f766e] px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          {ok ? "✓ Guardado" : guardando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}
