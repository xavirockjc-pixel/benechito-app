"use client";

import { useState } from "react";

type Cli = { id: string; nombre: string; tel: string | null; catalogo: string; tipo: "Negocio" | "Particular" };

const DEFECTO = "Hola {nombre}! 👋 {dia} pasamos por tu sector con Benechito 🛵🍦.\n¿Deseas agendar tu pedido? Mira el catálogo y las promociones aquí 👉 {catalogo}\nInscríbete en el portal y opta a beneficios y novedades 🎁. ¡Gracias!";

/** Lista de clientes del sector con un mensaje editable (catálogo / promo / novedad). */
export default function AvisarSectorClientes({ clientes, dia }: { clientes: Cli[]; dia: string }) {
  const [msg, setMsg] = useState(DEFECTO);

  function link(c: Cli) {
    const texto = msg.replaceAll("{nombre}", c.nombre).replaceAll("{dia}", dia).replaceAll("{catalogo}", c.catalogo);
    const t = (c.tel ?? "").replace(/\D/g, "");
    return t ? `https://wa.me/${t}?text=${encodeURIComponent(texto)}` : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-bold text-slate-600">Mensaje a enviar</label>
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
        <p className="text-[10px] text-slate-400">Usa {"{nombre}"}, {"{dia}"} y {"{catalogo}"}; se reemplazan por cada cliente. Cámbialo para promos o productos nuevos.</p>
      </div>

      {clientes.length === 0 ? (
        <p className="text-sm text-slate-500">No hay clientes en ese sector todavía.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {clientes.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="text-sm font-semibold text-slate-800">{c.nombre}</span>
                <span className="block text-[11px] text-slate-400">{c.tipo}{c.tel ? "" : " · sin WhatsApp"}</span>
              </span>
              <a href={link(c)} target="_blank" rel="noreferrer" className="shrink-0 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white">💬 Enviar</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
