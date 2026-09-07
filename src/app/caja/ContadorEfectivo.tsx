"use client";

import { useEffect, useState } from "react";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const BILLETES = [20000, 10000, 5000, 2000, 1000];
const MONEDAS = [500, 100, 50, 10];
const DENOMS = [...BILLETES, ...MONEDAS];

/** Cuenta billetes y monedas y calcula el total. Deja el total y el desglose en inputs ocultos. */
export default function ContadorEfectivo({ name, onChange }: { name: string; onChange?: (total: number) => void }) {
  const [c, setC] = useState<Record<number, string>>({});
  const cant = (d: number) => parseInt((c[d] ?? "").replace(/[^\d]/g, ""), 10) || 0;
  const total = DENOMS.reduce((s, d) => s + d * cant(d), 0);

  useEffect(() => { onChange?.(total); }, [total, onChange]);

  const desglose = JSON.stringify(Object.fromEntries(DENOMS.map((d) => [d, cant(d)]).filter(([, q]) => (q as number) > 0)));

  const fila = (d: number) => (
    <label key={d} className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-right text-sm font-bold text-slate-600">{CLP(d)}</span>
      <span className="text-slate-400">×</span>
      <input inputMode="numeric" value={c[d] ?? ""} onChange={(e) => setC((p) => ({ ...p, [d]: e.target.value }))} placeholder="0"
        className="w-14 rounded border border-slate-300 px-2 py-1 text-center text-sm" />
      <span className="ml-auto text-xs font-semibold text-slate-400 tabular-nums">{CLP(d * cant(d))}</span>
    </label>
  );

  return (
    <div>
      <input type="hidden" name={name} value={total} />
      <input type="hidden" name={`${name}_desglose`} value={desglose} />
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        <div className="space-y-1.5"><p className="text-[10px] font-bold uppercase text-slate-400">Billetes</p>{BILLETES.map(fila)}</div>
        <div className="space-y-1.5"><p className="text-[10px] font-bold uppercase text-slate-400">Monedas</p>{MONEDAS.map(fila)}</div>
      </div>
      <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-900 px-3 py-2 text-white">
        <span className="text-sm font-bold">Total contado</span>
        <span className="text-lg font-extrabold tabular-nums">{CLP(total)}</span>
      </div>
    </div>
  );
}
