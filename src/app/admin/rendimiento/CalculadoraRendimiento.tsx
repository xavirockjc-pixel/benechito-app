"use client";

import { useMemo, useState } from "react";

type Insumo = { id: string; nombre: string; unidad: string; stock: number; porMezcla: number };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));

/**
 * Pronóstico de rendimiento: stock ÷ (uso por mezcla) = baldes/mezclas que alcanzan;
 * × (unidades por mezcla) = unidades producibles. El uso por mezcla se precarga con lo
 * aprendido (si hay registros) y se puede editar.
 */
export default function CalculadoraRendimiento({ insumos, aprendioDe }: { insumos: Insumo[]; aprendioDe: number }) {
  const [id, setId] = useState("");
  const [uso, setUso] = useState("");
  const [und, setUnd] = useState("");

  const sel = useMemo(() => insumos.find((m) => m.id === id) ?? null, [id, insumos]);

  const elegir = (v: string) => {
    setId(v);
    const m = insumos.find((x) => x.id === v);
    setUso(m && m.porMezcla > 0 ? String(m.porMezcla) : "");
  };

  const usoN = Math.max(0, Number(uso.replace(",", ".")) || 0);
  const undN = Math.max(0, Math.floor(Number(und) || 0));
  const mezclas = sel && usoN > 0 ? sel.stock / usoN : null;
  const unidades = mezclas != null && undN > 0 ? mezclas * undN : null;

  return (
    <div className="mt-4 space-y-3">
      <label className="block text-sm font-bold text-slate-700">Insumo
        <select value={id} onChange={(e) => elegir(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">
          <option value="">Elige un insumo…</option>
          {insumos.map((m) => <option key={m.id} value={m.id}>{m.nombre} ({fmt(m.stock)} {m.unidad})</option>)}
        </select>
      </label>

      {sel && (
        <>
          <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">Stock disponible</span>
            <span className="font-extrabold text-slate-800">{fmt(sel.stock)} {sel.unidad}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-slate-600">Usa por balde/mezcla ({sel.unidad})
              <input value={uso} onChange={(e) => setUso(e.target.value)} inputMode="decimal" placeholder="0"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
              {sel.porMezcla > 0 && <span className="mt-0.5 block text-[10px] text-slate-400">Aprendido: ~{fmt(sel.porMezcla)} {sel.unidad}/mezcla ({aprendioDe} mezclas)</span>}
            </label>
            <label className="text-xs font-bold text-slate-600">Unidades por balde/mezcla
              <input value={und} onChange={(e) => setUnd(e.target.value)} inputMode="numeric" placeholder="Ej: 50"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
              <span className="mt-0.5 block text-[10px] text-slate-400">Cuántos helados/paletas/postres salen de 1 balde</span>
            </label>
          </div>

          {/* Resultado */}
          <div className="rounded-2xl border-2 border-[#0891b2]/30 bg-cyan-50/50 p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Con tu stock rinde para</p>
            {mezclas == null ? (
              <p className="mt-1 text-sm text-slate-500">Pon cuánto usas por balde/mezcla ↑</p>
            ) : (
              <>
                <p className="mt-1 text-3xl font-extrabold text-[#0891b2]">{fmt(Math.floor(mezclas * 10) / 10)} <span className="text-base font-bold text-slate-500">baldes/mezclas</span></p>
                {unidades != null && <p className="mt-0.5 text-lg font-extrabold text-slate-800">≈ {fmt(Math.floor(unidades))} unidades</p>}
              </>
            )}
          </div>

          <p className="rounded-xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-400">
            💡 Es un pronóstico. Al <b>registrar los baldes/mezclas en Producción</b>, el insumo se descuenta solo del stock (puedes editar las cantidades usadas). El cerebro va afinando el &quot;usa por mezcla&quot;.
          </p>
        </>
      )}
    </div>
  );
}
