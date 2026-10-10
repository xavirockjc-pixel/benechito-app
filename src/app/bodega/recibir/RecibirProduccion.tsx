"use client";

import { useState } from "react";
import { recibirDeProduccion } from "../actions";

type Item = { clase: "sab" | "prod"; refId: string; nombre: string; disponible: number };

/** Lista lo que hay en Producción por recibir; el bodeguero ajusta cantidades y recibe.
 *  Los postres no van por sabor: se reciben como "sueltos" (u.) y/o "packs ×16". */
export default function RecibirProduccion({ items, postrePend = 0 }: { items: Item[]; postrePend?: number }) {
  const [cant, setCant] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [`${i.clase}:${i.refId}`, String(i.disponible)])),
  );
  const [sueltos, setSueltos] = useState("");
  const [packs, setPacks] = useState("");
  const [enviando, setEnviando] = useState(false);

  const setUno = (k: string, v: string) => setCant((c) => ({ ...c, [k]: v }));
  const nSueltos = Math.max(0, Number(sueltos.replace(/[^0-9]/g, "")) || 0);
  const nPacks = Math.max(0, Number(packs.replace(/[^0-9]/g, "")) || 0);
  const consumoPostre = nSueltos + nPacks * 16;
  const postreExcede = consumoPostre > postrePend;

  const totalRegular = items.reduce((s, i) => {
    const n = Math.min(Number(cant[`${i.clase}:${i.refId}`]?.replace(/[^0-9]/g, "")) || 0, i.disponible);
    return s + n;
  }, 0);
  const totalSel = totalRegular + consumoPostre;

  async function recibir(todo: boolean) {
    if (enviando || postreExcede) return;
    const regular = items
      .map((i) => {
        const k = `${i.clase}:${i.refId}`;
        const n = todo ? i.disponible : Math.min(Number(cant[k]?.replace(/[^0-9]/g, "")) || 0, i.disponible);
        return { clase: i.clase, refId: i.refId, cantidad: n, nombre: i.nombre };
      })
      .filter((i) => i.cantidad > 0);
    const payload: unknown[] = [...regular];
    // Postres: en "recibir todo" van como sueltos; si no, lo que haya escrito.
    const ps = todo ? postrePend : nSueltos;
    const pp = todo ? 0 : nPacks;
    if (ps + pp * 16 > 0) payload.push({ clase: "postre", sueltos: ps, packs: pp });
    if (payload.length === 0) return;
    setEnviando(true);
    const fd = new FormData();
    fd.set("items", JSON.stringify(payload));
    try { await recibirDeProduccion(fd); } finally { setEnviando(false); }
  }

  const nada = items.length === 0 && postrePend <= 0;
  if (nada) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
        No hay nada en Producción por recibir. 🎉
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Postres: consolidados (sueltos + packs ×16) */}
      {postrePend > 0 && (
        <div className="rounded-2xl border-2 border-violet-200 bg-violet-50 p-4 shadow-sm">
          <p className="text-sm font-extrabold text-violet-900">🍮 Postres (de producción)</p>
          <p className="mt-0.5 text-[11px] text-violet-700">Disponibles: <b>{postrePend} u.</b> — se reciben como sueltos o en packs de 16 (no por sabor).</p>
          <div className="mt-3 flex gap-2">
            <label className="flex-1 text-xs font-bold text-slate-600">Postres sueltos (u.)
              <input value={sueltos} onChange={(e) => setSueltos(e.target.value)} inputMode="numeric" placeholder="0"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-base font-semibold" />
            </label>
            <label className="flex-1 text-xs font-bold text-slate-600">Packs ×16
              <input value={packs} onChange={(e) => setPacks(e.target.value)} inputMode="numeric" placeholder="0"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-base font-semibold" />
            </label>
          </div>
          <p className={`mt-2 text-xs font-bold ${postreExcede ? "text-rose-600" : "text-violet-700"}`}>
            = {consumoPostre} u. de {postrePend}{postreExcede ? " · ⚠️ te pasaste del disponible" : ""}
          </p>
        </div>
      )}

      {/* Resto (sabores que no son postre + productos) */}
      {items.length > 0 && (
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
                  <input value={cant[k] ?? ""} onChange={(e) => setUno(k, e.target.value)} inputMode="numeric"
                    className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-right text-sm font-semibold" />
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={() => recibir(false)} disabled={enviando || postreExcede || totalSel <= 0}
          className="flex-1 rounded-xl bg-[#0f766e] py-3 text-sm font-extrabold text-white disabled:opacity-40">
          {enviando ? "Recibiendo…" : `Recibir ${totalSel > 0 ? `(${totalSel} u.)` : ""}`}
        </button>
        <button type="button" onClick={() => recibir(true)} disabled={enviando}
          className="rounded-xl border-2 border-[#0f766e] px-4 py-3 text-sm font-extrabold text-[#0f766e] disabled:opacity-40">
          Recibir todo
        </button>
      </div>
      <p className="text-[11px] text-slate-400">Al recibir, baja de Producción y sube a Bodega. Los postres entran como “sueltos” o “packs ×16”.</p>
    </div>
  );
}
