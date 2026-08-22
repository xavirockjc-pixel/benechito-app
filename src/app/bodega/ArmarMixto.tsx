"use client";

import { useMemo, useState } from "react";
import ControlVoz from "../vendedor/ControlVoz";
import type { CambioVoz } from "@/lib/dominio/voz";
import { armarMixto } from "./actions";

type Prod = { id: string; nombre: string };
type Sabor = { id: string; nombre: string };

export default function ArmarMixto({ productos, sabores }: { productos: Prod[]; sabores: Sabor[] }) {
  const [salida, setSalida] = useState("");
  const [mixtos, setMixtos] = useState("");
  const [bolsas, setBolsas] = useState<Record<string, number>>({});
  const porId = useMemo(() => new Map(sabores.map((s) => [s.id, s])), [sabores]);

  const cambiar = (id: string, d: number) =>
    setBolsas((c) => {
      const n = (c[id] ?? 0) + d;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  const aplicarVoz = (cambios: CambioVoz[]) => cambios.forEach((c) => cambiar(c.productoId, c.delta));

  const consumos = Object.entries(bolsas).map(([saborId, b]) => ({ saborId, nombre: porId.get(saborId)?.nombre ?? "", bolsas: b }));
  const totalBolsas = consumos.reduce((s, c) => s + c.bolsas, 0);
  const nMixtos = Number(mixtos);
  const listo = salida !== "" && totalBolsas > 0 && Number.isFinite(nMixtos) && nMixtos > 0;
  const nombreMixto = productos.find((p) => p.id === salida)?.nombre ?? "Mixto";

  return (
    <form action={armarMixto} className="space-y-3">
      <input type="hidden" name="productoMixtoId" value={salida} />
      <input type="hidden" name="nombreMixto" value={nombreMixto} />
      <input type="hidden" name="consumos" value={JSON.stringify(consumos)} />

      {/* Qué mixto se arma */}
      <label className="block text-sm font-bold text-slate-700">¿Qué mixto armas?
        <select value={salida} onChange={(e) => setSalida(e.target.value)} required
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#b45309]">
          <option value="">Selecciona el producto mixto…</option>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </label>

      {/* Bolsas de sabores que saca de cámara (voz o a mano) */}
      <div>
        <p className="mb-1 text-sm font-bold text-slate-700">Bolsas de sabores (×50) que sacaste de cámara</p>
        <ControlVoz
          productos={sabores}
          onCambios={aplicarVoz}
          etiqueta="Sabores por voz"
          hint="Di por ejemplo: “dos frutilla, una pistacho” (en bolsas)."
        />
        <details className="mt-2 rounded-xl border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-bold text-slate-700">➕ Elegir a mano</summary>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {sabores.map((s) => {
              const n = bolsas[s.id] ?? 0;
              return (
                <button key={s.id} type="button" onClick={() => cambiar(s.id, 1)}
                  className={`rounded-lg border p-2 text-left text-sm active:brightness-95 ${n > 0 ? "border-[#b45309] bg-amber-50" : "border-slate-200 bg-white"}`}>
                  <span className="block truncate font-semibold text-slate-800">{s.nombre}</span>
                  {n > 0 && <span className="text-xs font-bold text-[#b45309]">{n} bolsa{n > 1 ? "s" : ""}</span>}
                </button>
              );
            })}
          </div>
        </details>
      </div>

      {/* Resumen de bolsas elegidas */}
      {consumos.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <ul className="divide-y divide-slate-100">
            {consumos.map((c) => (
              <li key={c.saborId} className="flex items-center justify-between py-2 text-sm">
                <span className="min-w-0 truncate font-semibold text-slate-800">{c.nombre}</span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => cambiar(c.saborId, -1)} className="h-7 w-7 rounded bg-slate-100 font-bold">−</button>
                  <span className="w-14 text-center font-semibold">{c.bolsas} bols.</span>
                  <button type="button" onClick={() => cambiar(c.saborId, 1)} className="h-7 w-7 rounded bg-slate-100 font-bold">+</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cuántos mixtos salieron */}
      <label className="block text-sm font-bold text-slate-700">¿Cuántos mixtos salieron?
        <input type="number" min="1" step="1" inputMode="numeric" value={mixtos} onChange={(e) => setMixtos(e.target.value)}
          placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-lg font-semibold text-slate-800 outline-none focus:border-[#b45309]" />
      </label>

      <button disabled={!listo}
        className="w-full rounded-xl bg-[#b45309] py-3 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40">
        Registrar {nMixtos > 0 ? `${nMixtos} ` : ""}mixtos
      </button>
    </form>
  );
}
