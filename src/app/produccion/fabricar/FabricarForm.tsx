"use client";

import { useMemo, useState } from "react";


type Linea = { id: string; label: string; porKilo: number; muestras: number };
type Fila = { key: number; deposito: string; sabor: string; unidades: string };

export default function FabricarForm({
  action,
  lineas,
  saboresPorLinea,
}: {
  action: (fd: FormData) => Promise<void>;
  lineas: Linea[];
  saboresPorLinea: Record<string, string[]>;
}) {
  const [linea, setLinea] = useState(lineas[0]?.id ?? "");
  const [base, setBase] = useState("");
  const [baseUnidad, setBaseUnidad] = useState("l");
  const [preparador, setPreparador] = useState("");
  const [filas, setFilas] = useState<Fila[]>([{ key: 1, deposito: "1", sabor: "", unidades: "" }]);

  const lineaInfo = useMemo(() => lineas.find((l) => l.id === linea), [lineas, linea]);
  const sabores = saboresPorLinea[linea] ?? [];

  const kilos = Number(base.replace(",", ".")) || 0;
  const estimado = lineaInfo && lineaInfo.porKilo > 0 ? Math.round(kilos * lineaInfo.porKilo) : 0;
  const totalReal = filas.reduce((s, f) => s + (Number(f.unidades) || 0), 0);

  const setFila = (key: number, patch: Partial<Fila>) => setFilas((f) => f.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const addFila = () => setFilas((f) => [...f, { key: Date.now(), deposito: String(f.length + 1), sabor: "", unidades: "" }]);
  const delFila = (key: number) => setFilas((f) => (f.length > 1 ? f.filter((x) => x.key !== key) : f));

  const depositos = filas
    .map((f) => ({ deposito: f.deposito.trim() || "1", sabor: f.sabor.trim(), unidades: Math.floor(Number(f.unidades) || 0) }))
    .filter((d) => d.sabor && d.unidades > 0);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="linea" value={linea} />
      <input type="hidden" name="base" value={base} />
      <input type="hidden" name="baseUnidad" value={baseUnidad} />
      <input type="hidden" name="preparador" value={preparador} />
      <input type="hidden" name="depositos" value={JSON.stringify(depositos)} />

      {/* 1 — Línea */}
      <section className="rounded-2xl border-2 border-teal-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-extrabold text-teal-800">1 · ¿Qué línea produces?</h2>
        <div className="grid grid-cols-2 gap-2">
          {lineas.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setLinea(l.id)}
              className={`rounded-xl border-2 p-3 text-left ${linea === l.id ? "border-[#0f766e] bg-teal-50" : "border-slate-200 bg-white"}`}
            >
              <span className="block font-bold text-slate-900">{l.label}</span>
              <span className="block text-[11px] text-slate-400">
                {l.muestras > 0 ? `≈ ${l.porKilo} u/${baseUnidad} (aprendido)` : "sin datos aún"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 2 — Kilos + preparador + estimado */}
      <section className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-extrabold text-teal-800">2 · Base y preparador</h2>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="text-xs font-bold text-slate-600">Kilos / litros de base
            <input value={base} onChange={(e) => setBase(e.target.value)} inputMode="decimal" placeholder="Ej: 20"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
          </label>
          <label className="text-xs font-bold text-slate-600">Unidad
            <select value={baseUnidad} onChange={(e) => setBaseUnidad(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2.5 text-base">
              <option value="l">litros</option>
              <option value="kg">kilos</option>
            </select>
          </label>
        </div>
        <label className="mt-2 block text-xs font-bold text-slate-600">Preparador (quién mezcló)
          <input value={preparador} onChange={(e) => setPreparador(e.target.value)} placeholder="Ej: Juan"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </label>
        {estimado > 0 && (
          <p className="mt-2 rounded-lg bg-teal-50 px-3 py-2 text-sm font-bold text-teal-700">
            📈 Estimado: rinde ≈ <b>{estimado}</b> unidades ({lineaInfo?.muestras} tandas aprendidas)
          </p>
        )}
      </section>

      {/* 3 — Depósitos (reparto de sabores) */}
      <section className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-extrabold text-teal-800">3 · Depósitos y sabores</h2>
        <p className="mb-2 text-xs text-slate-500">Reparte los sabores en los depósitos/recipientes que usaste.</p>
        <datalist id={`sab-${linea}`}>{sabores.map((s) => <option key={s} value={s} />)}</datalist>
        <div className="space-y-2">
          {filas.map((f) => (
            <div key={f.key} className="flex items-end gap-2">
              <label className="w-14 shrink-0 text-[11px] font-bold text-slate-500">Dep.
                <input value={f.deposito} onChange={(e) => setFila(f.key, { deposito: e.target.value })}
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-center text-sm" />
              </label>
              <label className="min-w-0 flex-1 text-[11px] font-bold text-slate-500">Sabor
                <input value={f.sabor} onChange={(e) => setFila(f.key, { sabor: e.target.value })} list={`sab-${linea}`} placeholder="Sabor"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
              </label>
              <label className="w-20 shrink-0 text-[11px] font-bold text-slate-500">Unid.
                <input value={f.unidades} onChange={(e) => setFila(f.key, { unidades: e.target.value })} inputMode="numeric" placeholder="0"
                  className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-right text-sm font-bold" />
              </label>
              <button type="button" onClick={() => delFila(f.key)} aria-label="Quitar"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base font-bold text-red-500 active:bg-red-50">✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addFila} className="mt-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 active:bg-slate-200">
          + Otro depósito
        </button>

        {totalReal > 0 && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <span className="font-semibold text-slate-600">Total que salió</span>
            <span className="font-extrabold text-slate-900">
              {totalReal} u.
              {estimado > 0 && <span className={`ml-2 text-xs font-bold ${totalReal >= estimado ? "text-green-600" : "text-amber-600"}`}>
                (estimado {estimado})
              </span>}
            </span>
          </div>
        )}
      </section>

      <button
        disabled={depositos.length === 0}
        className="w-full rounded-2xl bg-[#0f766e] py-4 text-base font-extrabold text-white shadow active:brightness-110 disabled:opacity-40"
      >
        ✅ Guardar fabricación {totalReal > 0 ? `(${totalReal} u.)` : ""}
      </button>
      <p className="text-center text-[11px] text-slate-400">Descuenta insumos por receta, suma lo producido a bodega y afina el rendimiento.</p>
    </form>
  );
}
