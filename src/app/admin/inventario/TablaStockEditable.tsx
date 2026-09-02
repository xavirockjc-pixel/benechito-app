"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fijarStock } from "./actions";

type Item = { id: string; nombre: string; stockMinimo?: number };

/**
 * Tabla de stock EDITABLE: escribes la cantidad de cada producto en cada ubicación
 * y guardas. Modo manual directo (sin depender de producción/ventas). Cada cambio
 * queda registrado como ajuste.
 */
export default function TablaStockEditable({ titulo, productos, ubicaciones, cant, vacio }: {
  titulo: string; productos: Item[]; ubicaciones: Item[]; cant: Record<string, number>; vacio?: string;
}) {
  const router = useRouter();
  const [pend, setPend] = useState<Record<string, number>>({}); // "pid:uid" -> nuevo valor
  const [guardando, startTransition] = useTransition();
  const [okMsg, setOkMsg] = useState("");

  const cambios = useMemo(() => Object.keys(pend).length, [pend]);

  const onEdit = (pid: string, uid: string, raw: string) => {
    const key = `${pid}:${uid}`;
    const val = Math.max(0, Math.floor(Number(raw) || 0));
    const actual = cant[key] ?? 0;
    setPend((p) => {
      const n = { ...p };
      if (val === actual) delete n[key];
      else n[key] = val;
      return n;
    });
  };

  const guardar = () => {
    const entradas = Object.entries(pend);
    if (!entradas.length) return;
    startTransition(async () => {
      for (const [key, val] of entradas) {
        const [pid, uid] = key.split(":");
        await fijarStock(pid, uid, val);
      }
      setPend({});
      setOkMsg(`✓ ${entradas.length} cambio(s) guardado(s)`);
      router.refresh();
      setTimeout(() => setOkMsg(""), 2500);
    });
  };

  if (productos.length === 0) {
    return (
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{titulo} (0)</h2>
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">{vacio ?? "Sin productos."}</p>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">{titulo} ({productos.length})</h2>
        <div className="flex items-center gap-2">
          {okMsg && <span className="text-xs font-bold text-emerald-600">{okMsg}</span>}
          <button
            onClick={guardar} disabled={cambios === 0 || guardando}
            className="rounded-lg bg-[#0f766e] px-3 py-1.5 text-xs font-extrabold text-white disabled:opacity-40"
          >
            {guardando ? "Guardando…" : cambios > 0 ? `💾 Guardar (${cambios})` : "💾 Guardar"}
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">Producto</th>{ubicaciones.map((u) => <th key={u.id} className="px-3 py-3 text-right">{u.nombre}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {productos.map((p) => {
              const totalProd = ubicaciones.reduce((s, u) => { const k = `${p.id}:${u.id}`; return s + (pend[k] ?? cant[k] ?? 0); }, 0);
              const bajo = (p.stockMinimo ?? 0) > 0 && totalProd <= (p.stockMinimo ?? 0);
              return (
              <tr key={p.id} className={`hover:bg-slate-50 ${bajo ? "bg-red-50/60" : ""}`}>
                <td className="px-4 py-2 font-semibold text-slate-800">
                  {p.nombre}
                  {bajo && <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700" title={`Stock bajo (mín ${p.stockMinimo})`}>⚠ bajo</span>}
                </td>
                {ubicaciones.map((u) => {
                  const key = `${p.id}:${u.id}`;
                  const base = cant[key] ?? 0;
                  const editado = pend[key] !== undefined;
                  return (
                    <td key={u.id} className="px-3 py-1.5 text-right">
                      <input
                        type="number" min="0" step="1" inputMode="numeric"
                        defaultValue={base}
                        onChange={(e) => onEdit(p.id, u.id, e.target.value)}
                        className={`w-20 rounded-lg border px-2 py-1 text-right text-sm outline-none focus:border-[#0f766e] ${editado ? "border-[#0f766e] bg-teal-50 font-bold" : "border-slate-200"}`}
                      />
                    </td>
                  );
                })}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Escribe la cantidad real en cada casilla y pulsa Guardar. Cada cambio queda registrado como ajuste.</p>
    </section>
  );
}
