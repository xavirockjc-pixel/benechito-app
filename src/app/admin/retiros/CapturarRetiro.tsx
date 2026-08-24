"use client";

import { useMemo, useState } from "react";
import { crearRetiro } from "@/app/_shared/retiros-actions";
import { CANALES, canalIcono, canalLabel, DESTINOS, destinoIcono, destinoLabel } from "@/lib/dominio/agenda";

type Cliente = { id: string; nombreNegocio: string; comuna: string };

/**
 * Captura en la central un pedido de retiro que entró por WhatsApp / Facebook /
 * Instagram. Se puede asociar a un cliente existente o escribir un contacto libre,
 * y despacharlo al toque a local / bodega / reparto (o dejarlo sin despachar).
 */
export default function CapturarRetiro({ clientes }: { clientes: Cliente[] }) {
  const [canal, setCanal] = useState<string>("whatsapp");
  const [destino, setDestino] = useState<string>("central");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Cliente | null>(null);

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return clientes
      .filter((c) => c.nombreNegocio.toLowerCase().includes(t) || (c.comuna ?? "").toLowerCase().includes(t))
      .slice(0, 6);
  }, [q, clientes]);

  return (
    <form action={crearRetiro} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="mb-3 text-sm font-bold text-slate-700">Nuevo pedido de retiro</p>

      {/* Canal de entrada */}
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">¿Por dónde llegó?</label>
      <div className="mb-3 grid grid-cols-4 gap-2">
        {CANALES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCanal(c)}
            className={`rounded-lg py-2 text-xs font-bold ${canal === c ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {canalIcono[c]} {canalLabel[c]}
          </button>
        ))}
      </div>
      <input type="hidden" name="canal" value={canal} />

      {/* Cliente existente o contacto libre */}
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Cliente</label>
      {sel ? (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-slate-50 p-3">
          <span className="truncate font-bold text-slate-900">{sel.nombreNegocio}</span>
          <button type="button" onClick={() => setSel(null)} className="text-xs font-semibold text-slate-500">
            quitar
          </button>
        </div>
      ) : (
        <>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente de la base…"
            className="mb-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500"
          />
          {filtrados.length > 0 && (
            <div className="mb-1 space-y-1">
              {filtrados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setSel(c); setQ(""); }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50"
                >
                  <span className="truncate font-semibold text-slate-800">{c.nombreNegocio}</span>
                  <span className="ml-2 shrink-0 text-xs text-slate-400">{c.comuna}</span>
                </button>
              ))}
            </div>
          )}
          <input
            name="contacto"
            placeholder="…o escribe nombre / teléfono si no está en la base"
            className="mb-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-500"
          />
        </>
      )}
      <input type="hidden" name="negocioId" value={sel?.id ?? ""} />

      {/* Qué pide */}
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">¿Qué pide?</label>
      <textarea
        name="notas"
        rows={2}
        placeholder="Ej: 3 cajas surtido + 1 frutilla, retira a las 18:00"
        className="mb-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-slate-500"
      />

      {/* Cuándo */}
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Cuándo</label>
      <div className="mb-3 flex gap-2">
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-bold text-slate-600 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-900 has-[:checked]:text-white">
          <input type="radio" name="cuando" value="hoy" defaultChecked className="hidden" /> Hoy
        </label>
        <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-sm font-bold text-slate-600 has-[:checked]:border-slate-900 has-[:checked]:bg-slate-900 has-[:checked]:text-white">
          <input type="radio" name="cuando" value="manana" className="hidden" /> Mañana
        </label>
      </div>

      {/* Despachar directo (opcional) */}
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">Despachar a (opcional)</label>
      <div className="mb-4 grid grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => setDestino("central")}
          className={`rounded-lg py-2 text-xs font-bold ${destino === "central" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}
        >
          ⏸️ Después
        </button>
        {DESTINOS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDestino(d)}
            className={`rounded-lg py-2 text-xs font-bold ${destino === d ? "bg-[#1479c4] text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {destinoIcono[d]} {destinoLabel[d].split(" ")[0]}
          </button>
        ))}
      </div>
      <input type="hidden" name="destino" value={destino} />

      <button className="w-full rounded-xl bg-[#1479c4] py-3 text-base font-extrabold text-white shadow-sm active:brightness-110">
        🧾 Registrar pedido de retiro
      </button>
    </form>
  );
}
