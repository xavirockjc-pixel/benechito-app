"use client";

import { useEffect, useRef, useState } from "react";
import { crearSabor } from "./actions";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

/** Agrega uno o varios sabores a un tipo, por texto o por voz ("frutilla, pistacho, mango"). */
export default function AgregarSaborVoz({ linea }: { linea: string }) {
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [texto, setTexto] = useState("");

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    recRef.current = rec;
  }, []);

  const escuchar = () => {
    const rec = recRef.current;
    if (!rec || escuchando) return;
    rec.onresult = (e) => setTexto((t) => (t ? t + ", " : "") + e.results[0][0].transcript);
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  };

  return (
    <form action={crearSabor} className="mt-3 flex items-center gap-2">
      <input type="hidden" name="linea" value={linea} />
      <input
        name="nombre"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Sabor(es) — ej: frutilla, pistacho"
        className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      {soportado && (
        <button type="button" onClick={escuchar} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-bold text-white ${escuchando ? "animate-pulse bg-red-500" : "bg-[#0f766e]"}`} title="Dictar">🎙️</button>
      )}
      <button className="shrink-0 rounded-lg bg-[#1479c4] px-3 py-2 text-sm font-bold text-white">Agregar</button>
    </form>
  );
}
