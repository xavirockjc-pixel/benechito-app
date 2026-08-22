"use client";

import { useEffect, useRef, useState } from "react";
import { interpretarComandoVenta, type CambioVoz, type ProdVoz } from "@/lib/dominio/voz";

/* Tipos mínimos del API de voz del navegador (Web Speech API). */
type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

export default function ControlVoz({
  productos,
  onCambios,
  etiqueta = "Agregar por voz",
  hint = "Di por ejemplo: “tres trufas”, “dos paletas de leche”, “quita una trufa”.",
}: {
  productos: ProdVoz[];
  onCambios: (cambios: CambioVoz[]) => void;
  etiqueta?: string;
  hint?: string;
}) {
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [dijo, setDijo] = useState<string | null>(null);
  const [resumen, setResumen] = useState<string | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL";
    rec.interimResults = false;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    recRef.current = rec;
  }, []);

  const escuchar = () => {
    const rec = recRef.current;
    if (!rec || escuchando) return;
    setDijo(null);
    setResumen(null);
    rec.onresult = (e) => {
      const texto = e.results[0][0].transcript;
      setDijo(texto);
      const cambios = interpretarComandoVenta(texto, productos);
      if (cambios.length === 0) {
        setResumen("No entendí ningún producto. Intenta: “tres trufas”.");
      } else {
        onCambios(cambios);
        setResumen(
          cambios.map((c) => `${c.delta > 0 ? "+" : ""}${c.delta} ${c.nombre}`).join(" · "),
        );
      }
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try {
      rec.start();
      setEscuchando(true);
    } catch {
      setEscuchando(false);
    }
  };

  if (!soportado) return null; // en navegadores sin voz, simplemente no aparece

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <button
        type="button"
        onClick={escuchar}
        disabled={escuchando}
        className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-extrabold text-white shadow active:brightness-95 ${escuchando ? "animate-pulse bg-red-500" : "bg-[#1479c4]"}`}
      >
        🎙️ {escuchando ? "Escuchando… habla ahora" : etiqueta}
      </button>
      {dijo && <p className="mt-2 text-center text-xs text-slate-500">Escuché: “{dijo}”</p>}
      {resumen && <p className="mt-1 text-center text-sm font-bold text-green-700">{resumen}</p>}
      {!dijo && (
        <p className="mt-2 text-center text-[11px] leading-tight text-slate-400">{hint}</p>
      )}
    </div>
  );
}
