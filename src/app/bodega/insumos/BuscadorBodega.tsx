"use client";

import { useMemo, useRef, useState } from "react";
import { fmtCant } from "@/lib/dominio/materias";

type Item = { id: string; nombre: string; unidad: string; stock: number; ultimaLlegada: string | null; bajo: boolean };

/**
 * Buscador del bodeguero: escribe o DICTA un insumo y ve al tiro cuándo llegó por
 * última vez y cuánto debería quedar. Sin listas largas.
 */
export default function BuscadorBodega({ materiales }: { materiales: Item[] }) {
  const [q, setQ] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const recRef = useRef<unknown>(null);

  const res = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return materiales.filter((m) => m.nombre.toLowerCase().includes(t)).slice(0, 10);
  }, [q, materiales]);

  const dictar = () => {
    try {
      const w = window as unknown as { webkitSpeechRecognition?: new () => unknown; SpeechRecognition?: new () => unknown };
      const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!SR) return;
      const rec = new SR() as { lang: string; interimResults: boolean; onresult: (e: unknown) => void; onend: () => void; start: () => void; stop: () => void };
      recRef.current = rec;
      rec.lang = "es-CL";
      rec.interimResults = false;
      rec.onresult = (e: unknown) => {
        const ev = e as { results: Record<number, Record<number, { transcript: string }>> };
        const txt = ev.results?.[0]?.[0]?.transcript ?? "";
        if (txt) setQ(txt.trim());
      };
      rec.onend = () => setEscuchando(false);
      setEscuchando(true);
      rec.start();
    } catch { setEscuchando(false); }
  };

  return (
    <div className="rounded-2xl border border-[#b45309]/30 bg-amber-50/40 p-3 shadow-sm">
      <p className="text-sm font-extrabold text-slate-900">🔎 Buscar insumo</p>
      <p className="mt-0.5 text-[11px] text-slate-500">Dicta o escribe y ve cuándo llegó y cuánto queda.</p>
      <div className="mt-2 flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ej: azúcar, leche, palitos…"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#b45309]" />
        <button type="button" onClick={dictar}
          className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-extrabold text-white ${escuchando ? "bg-red-500 animate-pulse" : "bg-[#b45309]"}`}>
          {escuchando ? "🎙️…" : "🎙️"}
        </button>
      </div>

      {q.trim() && (
        <div className="mt-2 space-y-1.5">
          {res.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">No hay un insumo con ese nombre.</p>
          ) : res.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-800">{m.nombre}</p>
                <p className="text-[11px] text-slate-400">📅 Llegó: {m.ultimaLlegada ?? "sin registro"}</p>
              </div>
              <span className={`shrink-0 text-right text-sm font-extrabold ${m.bajo ? "text-red-600" : "text-slate-900"}`}>
                {fmtCant(m.stock, m.unidad)}
                <span className="block text-[9px] font-semibold uppercase text-slate-400">quedan</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
