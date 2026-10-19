"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { parsearPedidoWhatsapp } from "@/lib/dominio/reparto";
import { crearPendienteRapido } from "../actions";
import MicDictado from "@/components/MicDictado";

/**
 * Captura RÁPIDA de un pedido de WhatsApp: pegas el mensaje y la app saca sola
 * el pedido, el teléfono y la ubicación (link de Maps / coordenadas). Solo eliges
 * el sector y la fecha. Pensado para no andar saltando de WhatsApp al app.
 */
export default function CapturaRapida({ sugerencias, initial = "" }: { sugerencias: string[]; initial?: string }) {
  const [texto, setTexto] = useState(initial);
  const [telOverride, setTelOverride] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const [ok, setOk] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const parsed = useMemo(() => parsearPedidoWhatsapp(texto), [texto]);
  const tieneUbic = parsed.lat != null || !!parsed.mapsUrl;
  const telMostrado = telOverride ?? parsed.telefono ?? "";
  const hoy = new Date().toLocaleDateString("en-CA");

  const enviar = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!String(fd.get("pedido") ?? "").trim()) return;
    startTransition(async () => {
      await crearPendienteRapido(fd);
      setTexto(""); setTelOverride(null);
      formRef.current?.reset();
      setOk(true);
      setTimeout(() => setOk(false), 2500);
    });
  };

  return (
    <form ref={formRef} onSubmit={enviar} className="space-y-2.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-extrabold text-slate-800">➕ Pega el WhatsApp</p>
        <MicDictado etiqueta="🎤 Dictar" />
      </div>

      {/* El mensaje: pega o dicta. De aquí sale todo. */}
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Pega aquí el mensaje de WhatsApp (pedido + ubicación + teléfono) o dícta­lo…"
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1479c4]"
      />
      {/* Lo que se enviará como pedido (limpio, sin el link de mapa). */}
      <input type="hidden" name="pedido" value={parsed.pedido || texto} />
      <input type="hidden" name="lat" value={parsed.lat ?? ""} />
      <input type="hidden" name="lng" value={parsed.lng ?? ""} />
      <input type="hidden" name="mapsUrl" value={parsed.mapsUrl ?? ""} />

      {/* Lo detectado automáticamente */}
      {texto.trim() && (
        <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
          <span className={`rounded-full px-2 py-0.5 ${tieneUbic ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
            {tieneUbic ? "📍 Ubicación lista ✓" : "📍 Sin ubicación — pega el link de Maps"}
          </span>
          <span className={`rounded-full px-2 py-0.5 ${telMostrado ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"}`}>
            {telMostrado ? `📞 ${telMostrado}` : "📞 Sin teléfono"}
          </span>
          {parsed.mapsUrl && (
            <a href={parsed.mapsUrl} target="_blank" rel="noreferrer" className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">ver mapa ↗</a>
          )}
        </div>
      )}

      {/* Teléfono editable (por si no lo detectó o quieres corregirlo) */}
      <input
        name="telefono" inputMode="tel" value={telMostrado}
        onChange={(e) => setTelOverride(e.target.value)}
        placeholder="Teléfono / WhatsApp"
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1479c4]"
      />

      <div className="grid grid-cols-2 gap-2">
        <input name="sector" list="sectores" placeholder="Sector (Lota, Coronel…)"
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1479c4]" />
        <input type="date" name="fecha" defaultValue={hoy} min={hoy}
          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1479c4]" />
        <datalist id="sectores">{sugerencias.map((s) => <option key={s} value={s} />)}</datalist>
      </div>
      <input name="cliente" placeholder="Cliente (opcional)"
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#1479c4]" />

      <button disabled={pendiente || !(parsed.pedido || texto).trim()}
        className="w-full rounded-xl bg-[#1479c4] py-2.5 text-sm font-extrabold text-white active:scale-95 disabled:opacity-50">
        {pendiente ? "Guardando…" : ok ? "✓ Anotado" : "➕ Anotar pedido"}
      </button>
      <p className="text-[11px] text-slate-400">Pega el WhatsApp (con su ubicación) → elige sector → Anotar. Queda guardado con teléfono y ubicación.</p>
    </form>
  );
}
