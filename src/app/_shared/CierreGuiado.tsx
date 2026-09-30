"use client";

import { useMemo, useState } from "react";
import { fijarStockConteo } from "@/app/bodega/actions";
import type { FilaCierre } from "./cierreStock";

/**
 * Cierre guiado de mercadería: por cada producto muestra lo que DEBERÍA quedar
 * (stock teórico), lo que entró y salió en el período, y pide contar lo REAL.
 * Calcula la diferencia (merma/sobra) y, al guardar, deja el stock en lo contado
 * (registrando el ajuste). Excepción hasta tener un orden fijo de entradas/salidas.
 */
export default function CierreGuiado({
  filas,
  zona,
  acento = "#0f7a44",
}: {
  filas: FilaCierre[];
  zona: "bodega" | "sala";
  acento?: string;
}) {
  const [contado, setContado] = useState<Record<string, string>>({});
  const [q, setQ] = useState("");

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const filtradas = useMemo(
    () => (q.trim() ? filas.filter((f) => norm(f.nombre).includes(norm(q.trim()))) : filas),
    [filas, q],
  );

  const valContado = (f: FilaCierre) => (contado[f.id] ?? String(f.deberia));
  const numContado = (f: FilaCierre) => Number(contado[f.id] ?? f.deberia) || 0;
  const dif = (f: FilaCierre) => numContado(f) - f.deberia;

  const setC = (id: string, v: string) => setContado((s) => ({ ...s, [id]: v.replace(/[^0-9]/g, "") }));

  // Solo se envían las filas contadas que difieren del teórico.
  const cambios = filas
    .filter((f) => contado[f.id] !== undefined && numContado(f) !== f.deberia)
    .map((f) => ({ id: f.id, cantidad: numContado(f) }));

  const totalFaltan = filas.reduce((s, f) => s + Math.min(0, dif(f)), 0); // negativo
  const totalSobran = filas.reduce((s, f) => s + Math.max(0, dif(f)), 0);
  const tocados = filas.filter((f) => contado[f.id] !== undefined).length;

  return (
    <div>
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2">
        <Tarjeta label="Contados" valor={`${tocados}/${filas.length}`} color="#334155" />
        <Tarjeta label="Faltan (merma)" valor={String(totalFaltan)} color="#e23b2c" />
        <Tarjeta label="Sobran" valor={`+${totalSobran}`} color={acento} />
      </div>

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar producto…"
        className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500"
      />

      <form action={fijarStockConteo} className="mt-3">
        <input type="hidden" name="zona" value={zona} />
        <input type="hidden" name="items" value={JSON.stringify(cambios)} />

        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
          {filtradas.map((f) => {
            const d = dif(f);
            const tocado = contado[f.id] !== undefined;
            return (
              <li key={f.id} className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-bold text-slate-800">{f.nombre}</span>
                  <span className="flex items-center gap-1.5 text-sm">
                    <span className="text-slate-400">conté</span>
                    <input
                      type="number" min="0" step="1" inputMode="numeric"
                      value={valContado(f)}
                      onChange={(e) => setC(f.id, e.target.value)}
                      className={`w-20 rounded-lg border px-2 py-1.5 text-right text-base font-bold outline-none ${tocado && d !== 0 ? "border-amber-400 bg-amber-50 text-amber-700" : "border-slate-300 text-slate-900"}`}
                    />
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                  <span>
                    debería <b className="text-slate-700">{f.deberia}</b>
                    <span className="text-slate-300"> · </span>
                    📥 {f.entro} <span className="text-slate-300"> · </span>📤 {f.salio}
                  </span>
                  {tocado && d !== 0 && (
                    <span className={`font-bold ${d < 0 ? "text-red-600" : "text-green-600"}`}>
                      {d < 0 ? `faltan ${-d}` : `sobran +${d}`}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <button
          disabled={cambios.length === 0}
          className="mt-4 w-full rounded-xl py-3 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40"
          style={{ background: acento }}
        >
          {cambios.length > 0 ? `Cerrar y guardar (${cambios.length} ajuste${cambios.length > 1 ? "s" : ""})` : "Todo cuadra ✓"}
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          Al guardar, el stock queda en lo que contaste y la diferencia se registra como ajuste
          (queda el respaldo para comparar). Solo se guardan los productos que cambiaste.
        </p>
      </form>
    </div>
  );
}

function Tarjeta({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-2 py-2 text-center">
      <p className="text-lg font-extrabold" style={{ color }}>{valor}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
