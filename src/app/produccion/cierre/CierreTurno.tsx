"use client";

import { useMemo, useState } from "react";

type Linea = { linea: string; label: string; litros: number; sabores: string[]; estimado: number; rendAprendido: number; tandas: number };
type Insumo = { nombre: string; unidad: string; categoria: string | null; cantidad: number; porLinea: Record<string, number> };

export default function CierreTurno({
  action,
  lineas,
  insumos,
}: {
  action: (fd: FormData) => Promise<void>;
  lineas: Linea[];
  insumos: Insumo[];
}) {
  const [reales, setReales] = useState<Record<string, string>>({});

  const set = (linea: string, v: string) => setReales((r) => ({ ...r, [linea]: v.replace(/[^0-9]/g, "") }));

  const payload = useMemo(
    () =>
      JSON.stringify(
        lineas
          .map((l) => ({ linea: l.linea, reales: Number(reales[l.linea] ?? "") || 0 }))
          .filter((r) => r.reales > 0),
      ),
    [lineas, reales],
  );
  const algunReal = lineas.some((l) => (Number(reales[l.linea] ?? "") || 0) > 0);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="reales" value={payload} />

      {/* 1 — Recuento real por línea */}
      <section className="space-y-3">
        <h2 className="text-sm font-extrabold text-teal-800">1 · ¿Cuánto salió de verdad?</h2>
        {lineas.map((l) => {
          const real = Number(reales[l.linea] ?? "") || 0;
          const rendReal = l.litros > 0 && real > 0 ? Math.round((real / l.litros) * 10) / 10 : 0;
          const diff = real > 0 ? real - l.estimado : 0;
          return (
            <div key={l.linea} className="rounded-2xl border-2 border-teal-100 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900">{l.label}</span>
                <span className="text-[11px] font-semibold text-slate-400">{l.tandas} tanda{l.tandas === 1 ? "" : "s"} · {l.litros} L</span>
              </div>
              {l.sabores.length > 0 && <p className="mt-0.5 text-[11px] text-slate-500">{l.sabores.join(" · ")}</p>}

              <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="font-semibold text-slate-600">Estimado por litros</span>
                <span className="font-bold text-slate-900">≈ {l.estimado} u.</span>
              </div>

              <label className="mt-2 block text-xs font-bold text-slate-600">✅ Salieron (real)
                <input value={reales[l.linea] ?? ""} onChange={(e) => set(l.linea, e.target.value)} inputMode="numeric" placeholder="unidades reales"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base font-bold" />
              </label>

              {real > 0 && (
                <div className="mt-2 flex items-center justify-between rounded-lg bg-teal-50 px-3 py-2 text-xs">
                  <span className="font-semibold text-teal-700">Rinde {rendReal} u/L</span>
                  <span className={`font-extrabold ${diff === 0 ? "text-slate-500" : diff > 0 ? "text-green-700" : "text-red-600"}`}>
                    {diff > 0 ? `+${diff}` : diff} vs estimado
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* 2 — Insumos consumidos en el turno */}
      {insumos.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-1 text-sm font-extrabold text-slate-900">2 · Insumos gastados este turno</h2>
          <p className="mb-2 text-[11px] text-slate-500">Palitos, bolsas, kilos… descontados por las recetas. Queda en el historial para cuadrar con stock y ventas.</p>
          <ul className="divide-y divide-slate-100 text-sm">
            {insumos.map((i) => (
              <li key={i.nombre} className="py-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{i.nombre}</span>
                  <span className="font-bold text-slate-900">{i.cantidad} {i.unidad}</span>
                </div>
                {Object.keys(i.porLinea).length > 1 && (
                  <p className="text-[11px] text-slate-400">{Object.entries(i.porLinea).map(([k, v]) => `${k}: ${v}`).join(" · ")}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <button
        disabled={!algunReal}
        className="w-full rounded-2xl bg-[#0f766e] py-4 text-base font-extrabold text-white shadow active:brightness-110 disabled:opacity-40"
      >
        ✅ Cerrar turno
      </button>
      <p className="text-center text-[11px] text-slate-400">Guarda el conteo real y cuadra el stock por la diferencia.</p>
    </form>
  );
}
