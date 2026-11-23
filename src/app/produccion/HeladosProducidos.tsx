"use client";

import { useState } from "react";
import { registrarHeladosProducidos } from "./actions";

type Prod = { id: string; nombre: string };
const TURNOS = [["1", "1er"], ["2", "2do"], ["3", "3er"]] as const;
const LUGARES = [["yobilo", "🏭 Yobilo"], ["villamora", "🏪 Villamora"]] as const;
const ICON = (n: string) => {
  const s = n.toLowerCase();
  if (s.includes("tú y yo") || s.includes("tu y yo")) return "🍦";
  if (s.includes("paleta") && s.includes("agua")) return "🧊";
  if (s.includes("paleta")) return "🍡";
  if (s.includes("postre")) return "🍨";
  if (s.includes("copa") || s.includes("garza")) return "🥤";
  if (s.includes("balde") || s.includes("litro")) return "🪣";
  return "📦";
};

/** Registra cuántos helados se hicieron en el turno/lugar (para el pago por producción). */
export default function HeladosProducidos({ productos }: { productos: Prod[] }) {
  const [turno, setTurno] = useState("1");
  const [maquina, setMaquina] = useState("yobilo");
  const [quien, setQuien] = useState("");
  const [cant, setCant] = useState<Record<string, string>>({});

  const items = productos
    .map((p) => ({ productoId: p.id, cantidad: Number((cant[p.id] || "").replace(/[^\d]/g, "")) || 0 }))
    .filter((i) => i.cantidad > 0);
  const totalU = items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <form action={registrarHeladosProducidos} className="space-y-3">
      <input type="hidden" name="turno" value={turno} />
      <input type="hidden" name="maquina" value={maquina} />
      <input type="hidden" name="nombres" value={quien} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase text-slate-400">Turno</p>
          <div className="flex gap-1">
            {TURNOS.map(([id, l]) => (
              <button key={id} type="button" onClick={() => setTurno(id)} className={`flex-1 rounded-lg border-2 py-1.5 text-xs font-bold ${turno === id ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-bold uppercase text-slate-400">Lugar</p>
          <div className="flex gap-1">
            {LUGARES.map(([id, l]) => (
              <button key={id} type="button" onClick={() => setMaquina(id)} className={`flex-1 rounded-lg border-2 py-1.5 text-[11px] font-bold ${maquina === id ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500"}`}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      <input value={quien} onChange={(e) => setQuien(e.target.value)} placeholder="¿Quién(es)? ej: Kevin"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />

      <ul className="divide-y divide-slate-100">
        {productos.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-800">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100 text-lg">{ICON(p.nombre)}</span>
              <span className="min-w-0 truncate">{p.nombre}</span>
            </span>
            <input value={cant[p.id] ?? ""} onChange={(e) => setCant((c) => ({ ...c, [p.id]: e.target.value.replace(/[^\d]/g, "") }))}
              inputMode="numeric" placeholder="0" className="w-20 shrink-0 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-base font-bold" />
          </li>
        ))}
      </ul>

      {items.length > 0 && (
        <button className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-extrabold text-white active:brightness-95">
          Registrar producción · {totalU} helados
        </button>
      )}
    </form>
  );
}
