"use client";

import { useState } from "react";
import { registrarTrato } from "./actions";

type Tarifa = { id: string; nombre: string; valorUnit: number };
const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

/** Registrar trato: elige producto (autollena nombre y $ c/u, TODO editable) y el monto sale solo. */
export default function RegistrarTratoForm({ trabajadorId, tarifas }: { trabajadorId: string; tarifas: Tarifa[] }) {
  const [concepto, setConcepto] = useState<string>(tarifas[0]?.nombre ?? "");
  const [valor, setValor] = useState<number>(tarifas[0]?.valorUnit ?? 0);
  const [cantidad, setCantidad] = useState<string>("");

  function elegir(id: string) {
    const t = tarifas.find((x) => x.id === id);
    if (t) { setConcepto(t.nombre); setValor(t.valorUnit); }
  }

  const cant = parseInt(cantidad.replace(/[^\d]/g, "") || "0", 10);
  const monto = cant * (Number(valor) || 0);

  return (
    <form action={registrarTrato} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="trabajadorId" value={trabajadorId} />

      {tarifas.length > 0 && (
        <label className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">Elegir</span>
          <select defaultValue="" onChange={(e) => e.target.value && elegir(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            <option value="">— producto —</option>
            {tarifas.map((t) => <option key={t.id} value={t.id}>{t.nombre} · {CLP(t.valorUnit)}</option>)}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">Producto</span>
        <input name="concepto" value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="nombre" className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">$ c/u</span>
        <input name="valorUnit" value={valor || ""} onChange={(e) => setValor(Number(e.target.value.replace(/[^\d]/g, "")) || 0)} inputMode="numeric" placeholder="$" className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </label>
      <label className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">Cantidad</span>
        <input name="cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value)} inputMode="numeric" placeholder="0" className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
      </label>
      <div className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">Monto</span>
        <span className="rounded-lg bg-amber-50 px-2 py-1.5 text-sm font-extrabold text-amber-700 tabular-nums">{CLP(monto)}</span>
      </div>
      <button className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white active:scale-95 disabled:opacity-50" disabled={monto <= 0}>Sumar trato</button>
    </form>
  );
}
