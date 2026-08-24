"use client";

import { useMemo, useState } from "react";
import { agendarEntrega } from "./actions";

type Cliente = { id: string; nombreNegocio: string; comuna: string };

/**
 * Formulario para agendar una entrega/pedido para un cliente (hoy o mañana).
 * Con buscador de cliente, qué llevar, cuándo, y un modo "exprés" (delivery).
 */
export default function AgendarForm({ clientes, clienteInicial }: { clientes: Cliente[]; clienteInicial?: string }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Cliente | null>(
    clienteInicial ? clientes.find((c) => c.id === clienteInicial) ?? null : null,
  );
  const [tipo, setTipo] = useState<"entrega" | "express">("entrega");

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return clientes.slice(0, 8);
    return clientes
      .filter((c) => c.nombreNegocio.toLowerCase().includes(t) || (c.comuna ?? "").toLowerCase().includes(t))
      .slice(0, 8);
  }, [q, clientes]);

  return (
    <form action={agendarEntrega} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="tipo" value={tipo} />

      {/* Tipo: entrega normal o exprés (delivery) */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setTipo("entrega")}
          className={`rounded-xl py-2.5 text-sm font-bold ${tipo === "entrega" ? "bg-[#1479c4] text-white" : "bg-slate-100 text-slate-600"}`}
        >
          📅 Entrega
        </button>
        <button
          type="button"
          onClick={() => setTipo("express")}
          className={`rounded-xl py-2.5 text-sm font-bold ${tipo === "express" ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          🛵 Pedido exprés
        </button>
      </div>

      {/* Cliente seleccionado o buscador */}
      {sel ? (
        <div className="mb-3 flex items-center justify-between rounded-xl bg-slate-50 p-3">
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-900">{sel.nombreNegocio}</p>
            <p className="truncate text-xs text-slate-500">{sel.comuna || "—"}</p>
          </div>
          <button type="button" onClick={() => setSel(null)} className="text-xs font-semibold text-[#1479c4]">
            Cambiar
          </button>
        </div>
      ) : (
        <div className="mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente por nombre o comuna…"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-[#1479c4]"
          />
          {q.trim() && (
            <div className="mt-2 space-y-1">
              {filtrados.length === 0 && <p className="px-2 text-xs text-slate-400">Sin resultados.</p>}
              {filtrados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSel(c);
                    setQ("");
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-left active:bg-slate-50"
                >
                  <span className="truncate text-sm font-semibold text-slate-800">{c.nombreNegocio}</span>
                  <span className="ml-2 shrink-0 text-xs text-slate-400">{c.comuna}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <input type="hidden" name="negocioId" value={sel?.id ?? ""} />

      {/* Cuándo */}
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Cuándo</label>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 has-[:checked]:border-[#1479c4] has-[:checked]:bg-blue-50 has-[:checked]:text-[#1479c4]">
          <input type="radio" name="cuando" value="hoy" defaultChecked className="accent-[#1479c4]" /> Hoy
        </label>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700 has-[:checked]:border-[#1479c4] has-[:checked]:bg-blue-50 has-[:checked]:text-[#1479c4]">
          <input type="radio" name="cuando" value="manana" className="accent-[#1479c4]" /> Mañana
        </label>
      </div>

      {/* Qué llevar */}
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Qué llevar</label>
      <textarea
        name="notas"
        rows={2}
        placeholder="Ej: 2 cajas surtido, 1 caja frutilla…"
        className="mb-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-[#1479c4]"
      />

      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Cantidad total (opcional)</label>
      <input
        name="cantidad"
        inputMode="numeric"
        placeholder="Ej: 3"
        className="mb-4 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-[#1479c4]"
      />

      <button
        disabled={!sel}
        className={`w-full rounded-2xl py-4 text-base font-extrabold text-white shadow active:brightness-95 ${tipo === "express" ? "bg-orange-500" : "bg-[#1479c4]"} disabled:opacity-40`}
      >
        {tipo === "express" ? "🛵 Registrar pedido exprés" : "📅 Agendar entrega"}
      </button>
    </form>
  );
}
