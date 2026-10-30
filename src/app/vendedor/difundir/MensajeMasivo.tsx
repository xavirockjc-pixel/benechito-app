"use client";

import { useMemo, useState } from "react";
import { enviarMensajeMasivo } from "./actions";

type Cliente = { id: string; nombre: string; sector: string; tel: string };

const PLANTILLAS: { icon: string; label: string; texto: string }[] = [
  { icon: "📢", label: "Promo", texto: "¡Hola {nombre}! 🐝 Esta semana en Benechito tenemos promociones. ¿Te preparo tu pedido?" },
  { icon: "🧊", label: "Recordar pedido", texto: "Hola {nombre} 👋 ¿Cómo vas de stock? ¿Te dejo tu pedido en la próxima vuelta?" },
  { icon: "📅", label: "Agendar", texto: "Hola {nombre} 👋 ¿Agendamos tu entrega para esta semana? Avísame qué día te acomoda." },
  { icon: "✅", label: "Confirmar", texto: "Hola {nombre} 👋 ¿Me confirmas tu pedido así paso a dejarlo? 🐝" },
];

const waNum = (w: string) => { const d = (w || "").replace(/\D/g, ""); return d.startsWith("56") ? d : d.length === 9 ? "56" + d : d; };

export default function MensajeMasivo({ clientes, sectores, central = false }: { clientes: Cliente[]; sectores: string[]; central?: boolean }) {
  const [texto, setTexto] = useState(PLANTILLAS[0].texto);
  const [link, setLink] = useState("");
  const [sector, setSector] = useState("");
  const [enviados, setEnviados] = useState<Set<string>>(new Set());

  const destinatarios = useMemo(
    () => clientes.filter((c) => c.tel && (!sector || c.sector === sector)),
    [clientes, sector],
  );

  const mensajeDe = (nombre: string) => {
    const base = texto.replace(/\{nombre\}/g, nombre.split(" ")[0] || nombre);
    return link.trim() ? `${base}\n${link.trim()}` : base;
  };

  const marcar = (id: string) => setEnviados((s) => new Set(s).add(id));

  return (
    <div className="space-y-4">
      {/* Plantillas rápidas */}
      <div className="flex flex-wrap gap-2">
        {PLANTILLAS.map((p) => (
          <button key={p.label} type="button" onClick={() => setTexto(p.texto)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 active:bg-slate-50">
            {p.icon} {p.label}
          </button>
        ))}
      </div>

      {/* Mensaje */}
      <label className="block text-sm font-bold text-slate-700">Mensaje (usa <code className="rounded bg-slate-100 px-1">{"{nombre}"}</code> y se reemplaza por cada cliente)
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4}
          className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 outline-none focus:border-[#1479c4]" />
      </label>

      {/* Link de catálogo / promo */}
      <label className="block text-sm font-bold text-slate-700">Link de catálogo o promo (opcional)
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://benechito.com/tienda"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1479c4]" />
      </label>

      {/* Filtro por sector */}
      <label className="block text-sm font-bold text-slate-700">Enviar a
        <select value={sector} onChange={(e) => setSector(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800">
          <option value="">Todos los sectores ({clientes.filter((c) => c.tel).length})</option>
          {sectores.map((s) => (
            <option key={s} value={s}>📍 {s} ({clientes.filter((c) => c.tel && c.sector === s).length})</option>
          ))}
        </select>
      </label>

      {/* Progreso */}
      <div className="flex items-center justify-between rounded-xl bg-blue-50 px-4 py-2.5 text-sm">
        <span className="font-bold text-[#1479c4]">{destinatarios.length} destinatarios</span>
        <span className="font-semibold text-slate-500">{enviados.size} enviados</span>
      </div>

      {/* Envío CENTRAL (desde el número Benechito): manda a todos de una, sin abrir
          el WhatsApp del teléfono. Ideal para avisar la ruta y pedir que agenden. */}
      {central && (
        <form action={enviarMensajeMasivo} className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <input type="hidden" name="texto" value={texto} />
          <input type="hidden" name="link" value={link} />
          <input type="hidden" name="sector" value={sector} />
          <button className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-extrabold text-white active:brightness-95">
            📣 Enviar a {destinatarios.length} desde el número Benechito
          </button>
          <p className="mt-1 text-center text-[11px] text-emerald-700">Sale de un solo contacto; no abre tu WhatsApp. {sector ? `Ruta: ${sector}.` : "Todas las rutas."}</p>
        </form>
      )}

      {/* Lista de envío uno por uno (respaldo / si el número central no está): abre WhatsApp del teléfono */}
      {central && <p className="pt-1 text-center text-xs font-bold text-slate-400">— o enviar uno por uno —</p>}
      <ul className="space-y-1.5">
        {destinatarios.map((c) => {
          const ya = enviados.has(c.id);
          return (
            <li key={c.id} className={`flex items-center justify-between gap-2 rounded-xl border p-2.5 shadow-sm ${ya ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"}`}>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">{c.nombre}</p>
                <p className="truncate text-xs text-slate-400">{c.sector}</p>
              </div>
              <a
                href={`https://wa.me/${waNum(c.tel)}?text=${encodeURIComponent(mensajeDe(c.nombre))}`}
                target="_blank" rel="noopener noreferrer" onClick={() => marcar(c.id)}
                className={`shrink-0 rounded-lg px-3 py-2 text-xs font-extrabold text-white active:scale-95 ${ya ? "bg-green-600" : "bg-[#1479c4]"}`}
              >
                {ya ? "✓ enviado" : "📲 Enviar"}
              </a>
            </li>
          );
        })}
      </ul>
      {destinatarios.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No hay clientes con WhatsApp en este sector.
        </p>
      )}
      <p className="text-center text-[11px] text-slate-400">
        Toca “Enviar” en cada cliente: se abre WhatsApp con el mensaje listo (lo revisas y envías). Los que ya mandaste quedan en verde.
      </p>
    </div>
  );
}
