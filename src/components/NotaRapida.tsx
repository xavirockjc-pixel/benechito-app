"use client";

import { useEffect, useRef, useState } from "react";
import { crearNota } from "@/app/notas/actions";
import {
  TIPOS_NOTA, tipoNotaLabel, tipoNotaIcono,
  AREAS_NOTA, areaNotaLabel, areaNotaIcono,
  detectaTipoNota, detectaAreaNota, detectaPrioridadNota, normalizaTexto,
} from "@/lib/dominio/notas";
import { PRIORIDADES, prioridadLabel } from "@/lib/dominio/mejoras";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

/**
 * Botón flotante de nota rápida, asistido por voz. Se coloca en el layout de
 * cada app. Detecta tipo/área/prioridad de lo dictado y deja editar antes de guardar.
 */
export default function NotaRapida({ area = "general", autor = "" }: { area?: string; autor?: string }) {
  const recRef = useRef<SpeechRec | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<string>("observacion");
  const [prioridad, setPrioridad] = useState<string>("media");
  const [areaSel, setAreaSel] = useState<string>(area);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      setTexto((prev) => (prev ? prev + " " : "") + t);
      const n = normalizaTexto(t);
      setTipo(detectaTipoNota(n));
      setPrioridad(detectaPrioridadNota(n));
      const a = detectaAreaNota(n);
      if (a !== "general") setAreaSel(a); // si no detecta, mantiene el área de la app
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
    if (!texto.trim() || guardando) return;
    setGuardando(true);
    const fd = new FormData();
    fd.set("texto", texto.trim());
    fd.set("tipo", tipo);
    fd.set("area", areaSel);
    fd.set("prioridad", prioridad);
    fd.set("autor", autor);
    try {
      await crearNota(fd);
      setOk(true);
      setTexto(""); setTipo("observacion"); setPrioridad("media"); setAreaSel(area);
      setTimeout(() => { setOk(false); setAbierto(false); }, 1100);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-amber-500 px-4 py-3 text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600 active:scale-95 transition"
        aria-label="Nota rápida"
      >
        <span className="text-lg">📝</span>
        <span className="hidden sm:inline text-sm font-semibold">Nota</span>
      </button>

      {/* Panel */}
      {abierto && (
        <div className="fixed bottom-20 right-5 z-50 w-[min(92vw,22rem)] rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">📝 Nota rápida</h3>
            <button onClick={() => setAbierto(false)} className="text-slate-400 hover:text-slate-700" aria-label="Cerrar">✕</button>
          </div>

          <div className="flex items-start gap-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escribe o dicta: tarea, observación, recordatorio…"
              rows={3}
              className="flex-1 resize-none rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-amber-400"
            />
            {soportado && (
              <button
                type="button"
                onClick={dictar}
                className={`shrink-0 rounded-lg p-2 text-lg ${escuchando ? "animate-pulse bg-rose-100" : "bg-amber-100 hover:bg-amber-200"}`}
                title="Dictar por voz"
              >
                {escuchando ? "🔴" : "🎤"}
              </button>
            )}
          </div>

          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <label className="flex flex-col gap-1">
              <span className="text-slate-500">Tipo</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-md border border-slate-300 p-1">
                {TIPOS_NOTA.map((t) => <option key={t} value={t}>{tipoNotaIcono[t]} {tipoNotaLabel[t]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-500">Área</span>
              <select value={areaSel} onChange={(e) => setAreaSel(e.target.value)} className="rounded-md border border-slate-300 p-1">
                {AREAS_NOTA.map((a) => <option key={a} value={a}>{areaNotaIcono[a]} {areaNotaLabel[a]}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-500">Prioridad</span>
              <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} className="rounded-md border border-slate-300 p-1">
                {PRIORIDADES.map((p) => <option key={p} value={p}>{prioridadLabel[p]}</option>)}
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={guardar}
            disabled={!texto.trim() || guardando}
            className="mt-3 w-full rounded-lg bg-amber-500 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
          >
            {ok ? "Guardada ✓" : guardando ? "Guardando…" : "Guardar nota"}
          </button>
          {!soportado && <p className="mt-2 text-[11px] text-slate-400">La voz no está disponible en este navegador; escribe la nota.</p>}
        </div>
      )}
    </>
  );
}
