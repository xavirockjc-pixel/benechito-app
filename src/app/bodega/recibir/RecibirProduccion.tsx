"use client";

import { useState } from "react";
import { recibirDeProduccion } from "../actions";

type Item = { clase: "sab" | "prod"; refId: string; nombre: string; disponible: number };

/** Lista lo que hay en Producción por recibir; el bodeguero ajusta cantidades y recibe. */
export default function RecibirProduccion({ items }: { items: Item[] }) {
  const [cant, setCant] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [`${i.clase}:${i.refId}`, String(i.disponible)])),
  );
  const [enviando, setEnviando] = useState(false);

  const setUno = (k: string, v: string) => setCant((c) => ({ ...c, [k]: v }));
  const totalSel = items.reduce((s, i) => {
    const n = Math.min(Number(cant[`${i.clase}:${i.refId}`]?.replace(/[^0-9]/g, "")) || 0, i.disponible);
    return s + n;
  }, 0);

  async function recibir(todo: boolean) {
    if (enviando) return;
    const payload = items
      .map((i) => {
        const k = `${i.clase}:${i.refId}`;
        const n = todo ? i.disponible : Math.min(Number(cant[k]?.replace(/[^0-9]/g, "")) || 0, i.disponible);
        return { clase: i.clase, refId: i.refId, cantidad: n, nombre: i.nombre };
      })
      .filter((i) => i.cantidad > 0);
    if (payload.length === 0) return;
    setEnviando(true);
    const fd = new FormData();
    fd.set("items", JSON.stringify(payload));
    try { await recibirDeProduccion(fd); } finally { setEnviando(false); }
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No hay nada en Producción por recibir. 🎉
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <ul className="divide-y divide-slate-100">
          {items.map((i) => {
            const k = `${i.clase}:${i.refId}`;
            return (
              <li key={k} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-800">{i.nombre}</span>
                  <span className="block text-[11px] text-slate-400">{i.clase === "sab" ? "Sabor" : "Producto"} · disponible {i.disponible}</span>
                </span>
                <input
                  value={cant[k] ?? ""}
                  onChange={(e) => setUno(k, e.target.value)}
                  inputMode="numeric"
                  className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-right text-sm font-semibold"
                />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => recibir(false)} disabled={enviando || totalSel <= 0}
          className="flex-1 rounded-xl bg-[#0f766e] py-3 text-sm font-extrabold text-white disabled:opacity-40">
          {enviando ? "Recibiendo…" : `Recibir ${totalSel > 0 ? `(${totalSel} u.)` : ""}`}
        </button>
        <button type="button" onClick={() => recibir(true)} disabled={enviando}
          className="rounded-xl border-2 border-[#0f766e] px-4 py-3 text-sm font-extrabold text-[#0f766e] disabled:opacity-40">
          Recibir todo
        </button>
      </div>
      <p className="text-[11px] text-slate-400">Al recibir, baja de Producción y sube a Bodega. Queda en el registro de bodega.</p>
    </div>
  );
}
