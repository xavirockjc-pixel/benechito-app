"use client";

import { useState } from "react";

/** Botón para copiar un texto al portapapeles, con feedback. */
export default function CopiarBtn({ texto, label = "📋 Copiar", className }: { texto: string; label?: string; className?: string }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setOk(true);
      setTimeout(() => setOk(false), 1500);
    } catch {
      /* si falla, no hacemos nada visible */
    }
  }
  return (
    <button
      type="button"
      onClick={copiar}
      className={className ?? "rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white active:scale-95"}
    >
      {ok ? "✓ Copiado" : label}
    </button>
  );
}
