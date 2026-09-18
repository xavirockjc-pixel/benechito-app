"use client";

import { useMemo, useState } from "react";

type Linea = { id: string; label: string; porKilo: number; muestras: number };
type Fila = { key: number; deposito: string; sabor: string; litros: string };

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
  const [preparador, setPreparador] = useState("");
  const [porLitroManual, setPorLitroManual] = useState("");
  const [unidadesReales, setUnidadesReales] = useState("");
  const [filas, setFilas] = useState<Fila[]>([{ key: 1, deposito: "1", sabor: "", litros: "" }]);

  const lineaInfo = useMemo(() => lineas.find((l) => l.id === linea), [lineas, linea]);
  const sabores = saboresPorLinea[linea] ?? [];

  const aprendido = lineaInfo && lineaInfo.porKilo > 0 ? lineaInfo.porKilo : 0;
  const porLitro = aprendido > 0 ? aprendido : Number(porLitroManual.replace(",", ".")) || 0;

  const setFila = (key: number, patch: Partial<Fila>) => setFilas((f) => f.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const addFila = () => setFilas((f) => [...f, { key: Date.now(), deposito: String(f.length + 1), sabor: "", litros: "" }]);
  const delFila = (key: number) => setFilas((f) => (f.length > 1 ? f.filter((x) => x.key !== key) : f));

  const filasCalc = filas.map((f) => {
    const litros = Number(f.litros.replace(",", ".")) || 0;
    return { ...f, litros, est: Math.round(litros * porLitro) };
  });
  const totalLitros = filasCalc.reduce((s, f) => s + f.litros, 0);
  const totalEst = filasCalc.reduce((s, f) => s + f.est, 0);

  const depositos = filasCalc
    .filter((f) => f.sabor.trim() && f.litros > 0)
    .map((f) => ({ deposito: f.deposito.trim() || "1", sabor: f.sabor.trim(), litros: f.litros }));

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="linea" value={linea} />
      <input type="hidden" name="preparador" value={preparador} />
      <input type="hidden" name="porLitro" value={porLitroManual} />
      <input type="hidden" name="unidadesReales" value={unidadesReales} />
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
                {l.muestras > 0 ? `≈ ${l.porKilo} u/litro (aprendido)` : "sin datos aún"}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 2 — Preparador (+ rendimiento aprox si aún no aprende) */}
      <section className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-extrabold text-teal-800">2 · Preparador</h2>
        <label className="block text-xs font-bold text-slate-600">¿Quién mezcló?
          <input value={preparador} onChange={(e) => setPreparador(e.target.value)} placeholder="Ej: Juan"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        </label>
        {aprendido === 0 && (
          <label className="mt-2 block text-xs font-bold text-slate-600">¿Cuántas unidades salen por litro? (aprox — luego lo aprende solo)
            <input value={porLitroManual} onChange={(e) => setPorLitroManual(e.target.value)} inputMode="decimal" placeholder="Ej: 12"
              className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
          </label>
        )}
        {aprendido > 0 && (
          <p className="mt-2 rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700">
            📈 Rendimiento aprendido: ≈ {aprendido} unidades por litro ({lineaInfo?.muestras} tandas)
          </p>
        )}
      </section>

      {/* 3 — Depósitos por LITROS → estima unidades */}
      <section className="rounded-2xl border border-teal-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-extrabold text-teal-800">3 · Depósitos y sabores (por litros)</h2>
        <p className="mb-2 text-xs text-slate-500">Pon los <b>litros</b> de cada depósito/balde y su sabor. El sistema estima las unidades.</p>
        <datalist id={`sab-${linea}`}>{sabores.map((s) => <option key={s} value={s} />)}</datalist>
        <div className="space-y-2">
          {filasCalc.map((f) => (
            <div key={f.key} className="rounded-xl border border-slate-100 p-2">
              <div className="flex items-end gap-2">
                <label className="w-12 shrink-0 text-[11px] font-bold text-slate-500">Dep.
                  <input value={f.deposito} onChange={(e) => setFila(f.key, { deposito: e.target.value })}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 px-1 py-2 text-center text-sm" />
                </label>
                <label className="min-w-0 flex-1 text-[11px] font-bold text-slate-500">Sabor
                  <input value={f.sabor} onChange={(e) => setFila(f.key, { sabor: e.target.value })} list={`sab-${linea}`} placeholder="Sabor"
                    className="mt-0.5 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                </label>
                <label className="w-20 shrink-0 text-[11px] font-bold text-slate-500">Litros
                  <input value={f.litros ? String(f.litros) : ""} onChange={(e) => setFila(f.key, { litros: e.target.value })} inputMode="decimal" placeholder="0"
                    className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-right text-sm font-bold" />
                </label>
                <button type="button" onClick={() => delFila(f.key)} aria-label="Quitar"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base font-bold text-red-500 active:bg-red-50">✕</button>
              </div>
              {f.est > 0 && <p className="mt-1 pl-1 text-[11px] font-bold text-teal-600">≈ {f.est} unidades estimadas</p>}
            </div>
          ))}
        </div>
        <button type="button" onClick={addFila} className="mt-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 active:bg-slate-200">
          + Otro depósito
        </button>

        {totalLitros > 0 && (
          <div className="mt-3 space-y-1 rounded-xl bg-slate-50 px-3 py-2 text-sm">
            <div className="flex items-center justify-between"><span className="font-semibold text-slate-600">Total litros</span><span className="font-bold text-slate-900">{totalLitros} L</span></div>
            <div className="flex items-center justify-between"><span className="font-semibold text-slate-600">Estimado de unidades</span><span className="font-extrabold text-teal-700">≈ {totalEst} u.</span></div>
          </div>
        )}
      </section>

      {/* 4 — Conteo real opcional */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-1 text-sm font-extrabold text-slate-900">4 · ¿Contaste el total real? (opcional)</h2>
        <p className="mb-2 text-[11px] text-slate-500">Si en el envasado contaste las unidades reales, ponlas y el sistema aprende mejor. Si no, deja vacío y usa el estimado.</p>
        <input value={unidadesReales} onChange={(e) => setUnidadesReales(e.target.value)} inputMode="numeric" placeholder="Total de unidades reales (opcional)"
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
      </section>

      <button
        disabled={depositos.length === 0}
        className="w-full rounded-2xl bg-[#0f766e] py-4 text-base font-extrabold text-white shadow active:brightness-110 disabled:opacity-40"
      >
        ✅ Guardar fabricación {totalEst > 0 ? `(≈ ${totalEst} u.)` : ""}
      </button>
      <p className="text-center text-[11px] text-slate-400">Descuenta insumos por receta (según litros), suma lo producido a bodega y afina el rendimiento.</p>
    </form>
  );
}
