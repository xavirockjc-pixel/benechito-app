"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Botón de dictado por voz (es-CL). Escribe en el campo de texto/número que
 * tengas seleccionado (input o textarea). Reutiliza Web Speech API (sin costo de IA).
 */
export default function MicDictado({ etiqueta = "🎤 Dictar" }: { etiqueta?: string }) {
  const [soportado, setSoportado] = useState(true);
  const [activo, setActivo] = useState(false);
  const objetivo = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const recRef = useRef<unknown>(null);

  useEffect(() => {
    const SR = (window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;
    if (!SR) setSoportado(false);
  }, []);

  function recordarObjetivo() {
    const el = document.activeElement;
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      objetivo.current = el as HTMLInputElement | HTMLTextAreaElement;
    }
  }

  function toggle() {
    const SRctor = (window as unknown as { SpeechRecognition?: new () => unknown; webkitSpeechRecognition?: new () => unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition;
    if (!SRctor) return;
    if (activo && recRef.current) {
      (recRef.current as { stop: () => void }).stop();
      return;
    }
    const rec = new SRctor() as {
      lang: string; interimResults: boolean; continuous: boolean;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onend: () => void; onerror: () => void; start: () => void; stop: () => void;
    };
    rec.lang = "es-CL";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      let texto = "";
      for (let i = 0; i < e.results.length; i++) texto += e.results[i][0].transcript;
      const el = objetivo.current;
      if (el && texto) {
        const sep = el.value && !el.value.endsWith(" ") ? " " : "";
        el.value = (el.value + sep + texto).trim();
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }
    };
    rec.onend = () => setActivo(false);
    rec.onerror = () => setActivo(false);
    recRef.current = rec;
    setActivo(true);
    rec.start();
  }

  if (!soportado) return null;

  return (
    <button
      type="button"
      onMouseDown={recordarObjetivo}
      onClick={toggle}
      className={`rounded-full px-4 py-2 text-sm font-bold shadow-sm active:scale-95 ${activo ? "bg-red-500 text-white" : "bg-[#1479c4] text-white"}`}
      title="Toca un campo y luego dicta"
    >
      {activo ? "⏹️ Detener" : etiqueta}
    </button>
  );
}
