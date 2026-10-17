"use client";

import { useState } from "react";
import { agendarCliente, quitarAgendado } from "../actions";

type Cli = {
  id: string; nombre: string; tel: string | null; catalogo: string; tipo: "Negocio" | "Particular";
  negocioId: string | null; lat: number | null; lng: number | null; enRuta: boolean; pedidoId: string | null;
};

const DEFECTO = "Hola {nombre}! 👋 {dia} pasamos por tu sector con Benechito 🛵🍦.\n¿Deseas agendar tu pedido? Mira el catálogo y las promociones aquí 👉 {catalogo}\nInscríbete en el portal y opta a beneficios y novedades 🎁. ¡Gracias!";

/** Clientes del sector: mensaje editable + marcar quién SÍ viene (entra a la ruta del día). */
export default function AvisarSectorClientes({ clientes, dia, diaIso }: { clientes: Cli[]; dia: string; diaIso: string }) {
  const [msg, setMsg] = useState(DEFECTO);

  function link(c: Cli) {
    const texto = msg.replaceAll("{nombre}", c.nombre).replaceAll("{dia}", dia).replaceAll("{catalogo}", c.catalogo);
    const t = (c.tel ?? "").replace(/\D/g, "");
    return t ? `https://wa.me/${t}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }
  const call = (fn: (fd: FormData) => Promise<void> | void, data: Record<string, string>) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.set(k, v));
    return fn(fd);
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold text-slate-600">Mensaje a enviar</label>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <p className="text-[10px] text-slate-400">Usa {"{nombre}"}, {"{dia}"} y {"{catalogo}"} (se reemplazan). Cámbialo para promos o productos nuevos.</p>
      </div>

      {clientes.length === 0 ? (
        <p className="text-sm text-slate-500">No hay clientes en ese sector todavía.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {clientes.map((c) => (
            <li key={c.id} className="py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="text-sm font-semibold text-slate-800">{c.nombre}</span>
                  <span className="block text-[11px] text-slate-400">{c.tipo}{c.tel ? "" : " · sin WhatsApp"}</span>
                </span>
                <a href={link(c)} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white">💬 Avisar</a>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                {c.enRuta ? (
                  <>
                    <span className="rounded-full bg-[#0f766e] px-2.5 py-0.5 text-[11px] font-bold text-white">✓ En la ruta de {dia}</span>
                    {c.pedidoId && <button type="button" onClick={() => call(quitarAgendado, { id: c.pedidoId! })} className="text-[11px] font-bold text-rose-400">quitar</button>}
                  </>
                ) : (
                  <button type="button"
                    onClick={() => call(agendarCliente, { dia: diaIso, cliente: c.nombre, telefono: c.tel ?? "", negocioId: c.negocioId ?? "", lat: c.lat != null ? String(c.lat) : "", lng: c.lng != null ? String(c.lng) : "" })}
                    disabled={!diaIso}
                    className="rounded-full border border-[#0f766e] px-3 py-0.5 text-[11px] font-bold text-[#0f766e] disabled:opacity-40">
                    ✅ Sí viene — agendar{!diaIso ? " (elige día)" : ""}
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
