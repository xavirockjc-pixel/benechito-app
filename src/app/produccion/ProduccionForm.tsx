"use client";

import { useMemo, useState } from "react";
import ControlVoz from "../vendedor/ControlVoz";
import type { CambioVoz } from "@/lib/dominio/voz";
import { registrarProduccion } from "./actions";

type Sabor = { id: string; nombre: string; linea: string };

const LINEAS_BASE = ["trufa", "cuchufli", "helado", "paleta", "postre"];
const lineaLabel: Record<string, string> = {
  trufa: "Trufas", cuchufli: "Cuchuflís", helado: "Helados", paleta: "Paletas", postre: "Postres",
};

export default function ProduccionForm({ sabores }: { sabores: Sabor[] }) {
  const lineas = useMemo(() => {
    const set = new Set([...LINEAS_BASE, ...sabores.map((s) => s.linea)]);
    return [...set];
  }, [sabores]);

  const [linea, setLinea] = useState(lineas[0] ?? "helado");
  const [cant, setCant] = useState<Record<string, number>>({});
  const [extras, setExtras] = useState<{ nombre: string; cantidad: number }[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCant, setNuevaCant] = useState("");

  const delLinea = sabores.filter((s) => s.linea === linea);
  const porId = useMemo(() => new Map(delLinea.map((s) => [s.id, s])), [delLinea]);

  const setQty = (id: string, n: number) =>
    setCant((c) => {
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  const aplicarVoz = (cambios: CambioVoz[]) =>
    cambios.forEach((c) => porId.has(c.productoId) && setQty(c.productoId, (cant[c.productoId] ?? 0) + c.delta));

  const agregarNuevo = () => {
    const nombre = nuevoNombre.trim();
    const n = Number(nuevaCant);
    if (!nombre || !Number.isFinite(n) || n <= 0) return;
    setExtras((e) => [...e, { nombre, cantidad: n }]);
    setNuevoNombre("");
    setNuevaCant("");
  };

  const items = [
    ...Object.entries(cant).map(([saborId, cantidad]) => ({ saborId, nombre: porId.get(saborId)?.nombre ?? "", cantidad })),
    ...extras.map((e) => ({ nombre: e.nombre, cantidad: e.cantidad })),
  ];
  const total = items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <form action={registrarProduccion} className="space-y-3">
      <input type="hidden" name="linea" value={linea} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      {/* Tipo */}
      <label className="block text-sm font-bold text-slate-700">Tipo de producto
        <select value={linea} onChange={(e) => { setLinea(e.target.value); setCant({}); setExtras([]); }}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#b45309]">
          {lineas.map((l) => <option key={l} value={l}>{lineaLabel[l] ?? l}</option>)}
        </select>
      </label>

      {/* Voz sobre los sabores de ese tipo */}
      <ControlVoz
        productos={delLinea.map((s) => ({ id: s.id, nombre: s.nombre }))}
        onCambios={aplicarVoz}
        etiqueta="Producción por voz"
        hint="Di por ejemplo: “treinta frutilla, veinte pistacho”."
      />

      {/* Sabores existentes de ese tipo */}
      {delLinea.length > 0 && (
        <div className="space-y-1">
          {delLinea.map((s) => (
            <label key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
              <span className="min-w-0 truncate font-semibold text-slate-800">{s.nombre}</span>
              <span className="flex items-center gap-2">
                <button type="button" onClick={() => setQty(s.id, (cant[s.id] ?? 0) - 1)} className="h-8 w-8 rounded bg-slate-100 font-bold">−</button>
                <input type="number" min="0" step="1" inputMode="numeric" value={cant[s.id] ?? ""} placeholder="0"
                  onChange={(e) => setQty(s.id, Number(e.target.value))}
                  className="w-16 rounded-lg border border-slate-300 px-2 py-2 text-right text-sm font-semibold" />
                <button type="button" onClick={() => setQty(s.id, (cant[s.id] ?? 0) + 1)} className="h-8 w-8 rounded bg-slate-100 font-bold">+</button>
              </span>
            </label>
          ))}
        </div>
      )}

      {/* Sabor nuevo */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3">
        <p className="mb-1 text-xs font-bold text-slate-600">➕ Sabor nuevo (si no está en la lista)</p>
        <div className="flex gap-2">
          <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre del sabor"
            className="flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          <input type="number" min="1" step="1" inputMode="numeric" value={nuevaCant} onChange={(e) => setNuevaCant(e.target.value)}
            placeholder="Cant." className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          <button type="button" onClick={agregarNuevo} className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-bold text-white">Añadir</button>
        </div>
        {extras.length > 0 && (
          <ul className="mt-2 space-y-1 text-sm">
            {extras.map((e, i) => (
              <li key={i} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1">
                <span className="font-semibold text-slate-800">{e.nombre} · {e.cantidad}</span>
                <button type="button" onClick={() => setExtras((x) => x.filter((_, j) => j !== i))} className="text-xs font-bold text-red-500">quitar</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button disabled={total === 0}
        className="w-full rounded-xl bg-[#b45309] py-3 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40">
        Registrar producción {total > 0 ? `(${total} u.)` : ""}
      </button>
    </form>
  );
}
