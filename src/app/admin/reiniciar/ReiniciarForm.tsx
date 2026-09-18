"use client";

import { useState } from "react";

type Area = { id: string; label: string; icono: string; desc: string; count: number };

export default function ReiniciarForm({ action, areas }: { action: (fd: FormData) => Promise<void>; areas: Area[] }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState("");

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const todos = () => setSel(sel.size === areas.length ? new Set() : new Set(areas.map((a) => a.id)));

  const listo = sel.size > 0 && confirmar.trim().toUpperCase() === "REINICIAR";

  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-slate-700">¿Qué secciones reinicias?</p>
        <button type="button" onClick={todos} className="text-xs font-bold text-[#1479c4]">
          {sel.size === areas.length ? "Quitar todo" : "Seleccionar todo"}
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {areas.map((a) => {
          const on = sel.has(a.id);
          return (
            <label key={a.id} className={`flex cursor-pointer gap-3 rounded-xl border-2 p-3 ${on ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"}`}>
              <input type="checkbox" name="areas" value={a.id} checked={on} onChange={() => toggle(a.id)} className="mt-0.5 h-5 w-5 accent-red-600" />
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-slate-900">{a.icono} {a.label}
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{a.count} reg.</span>
                </span>
                <span className="block text-[11px] text-slate-500">{a.desc}</span>
              </span>
            </label>
          );
        })}
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50/60 p-4">
        <p className="text-sm font-bold text-red-700">⚠️ Esto no se puede deshacer</p>
        <p className="mt-0.5 text-xs text-red-600">Para confirmar, escribe <b>REINICIAR</b> en mayúsculas.</p>
        <input value={confirmar} onChange={(e) => setConfirmar(e.target.value)} placeholder="REINICIAR"
          className="mt-2 w-48 rounded-lg border border-red-300 px-3 py-2 text-center text-base font-bold tracking-widest" />
      </div>

      <button disabled={!listo}
        className="w-full rounded-2xl bg-red-600 py-4 text-base font-extrabold text-white shadow active:brightness-95 disabled:cursor-not-allowed disabled:opacity-40">
        🗑️ Reiniciar {sel.size > 0 ? `${sel.size} sección(es)` : ""}
      </button>
    </form>
  );
}
