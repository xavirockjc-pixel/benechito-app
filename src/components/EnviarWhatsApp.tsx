"use client";

import { useState } from "react";

/**
 * Muestra un resumen editable y permite enviarlo por WhatsApp (elige el contacto)
 * o copiarlo. Si se pasa `telefono`, abre el chat directo con ese número.
 */
export default function EnviarWhatsApp({ texto, telefono }: { texto: string; telefono?: string }) {
  const [valor, setValor] = useState(texto);
  const [ok, setOk] = useState(false);
  const base = telefono ? `https://wa.me/${telefono.replace(/[^\d]/g, "")}` : "https://wa.me/";
  const href = `${base}?text=${encodeURIComponent(valor)}`;

  async function copiar() {
    try { await navigator.clipboard.writeText(valor); setOk(true); setTimeout(() => setOk(false), 1500); } catch { /* noop */ }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-800">📲 Enviar resumen por WhatsApp</h2>
        <span className="text-[11px] text-slate-400">editable antes de enviar</span>
      </div>
      <textarea
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        rows={10}
        className="w-full resize-y rounded-lg border border-slate-300 p-3 font-mono text-xs leading-relaxed text-slate-700 outline-none focus:border-emerald-400"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-extrabold text-white active:scale-95"
        >
          📲 Enviar por WhatsApp
        </a>
        <button type="button" onClick={copiar} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white active:scale-95">
          {ok ? "✓ Copiado" : "📋 Copiar"}
        </button>
      </div>
    </div>
  );
}
