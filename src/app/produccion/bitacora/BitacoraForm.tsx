"use client";

import { useState } from "react";

const EJEMPLOS = [
  "Queda poca esencia de vainilla",
  "Falta estabilizante",
  "La paletera está fallando",
  "Se acabaron las bolsas",
];

export default function BitacoraForm({ action }: { action: (fd: FormData) => Promise<void> }) {
  const [texto, setTexto] = useState("");

  return (
    <form action={action} className="rounded-2xl border-2 border-teal-100 bg-white p-4 shadow-sm">
      <label className="block text-sm font-extrabold text-teal-800">✍️ ¿Qué observaste?</label>
      <p className="mb-2 text-[11px] text-slate-500">Toca el recuadro y dicta con el 🎤, o escribe. Si dices “falta” o “queda poco”, se marca como pendiente para la central.</p>
      <textarea
        name="texto"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Ej: queda poca esencia de vainilla…"
        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-base"
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {EJEMPLOS.map((e) => (
          <button key={e} type="button" onClick={() => setTexto((t) => (t ? t + " · " : "") + e)}
            className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600 active:bg-slate-200">
            {e}
          </button>
        ))}
      </div>
      <button
        disabled={!texto.trim()}
        className="mt-3 w-full rounded-2xl bg-[#0f766e] py-3.5 text-base font-extrabold text-white shadow active:brightness-110 disabled:opacity-40"
      >
        📝 Guardar en bitácora
      </button>
    </form>
  );
}
