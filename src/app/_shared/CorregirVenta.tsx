"use client";

import { useState, useTransition } from "react";
import { anularVentaConPin, cambiarMedioConPin } from "./correccionesVenta";
import { MEDIOS_PAGO, medioPagoLabel } from "@/lib/dominio/ventas";

/**
 * Corrección de una venta con la CLAVE del dueño: anular (repone stock) o cambiar
 * el medio de pago. Se usa en la Caja y en el Central. Pide el PIN antes de aplicar.
 */
export default function CorregirVenta({ ventaId, medioActual }: { ventaId: string; medioActual?: string }) {
  const [pin, setPin] = useState("");
  const [medio, setMedio] = useState(medioActual || "efectivo");
  const [msg, setMsg] = useState<{ ok: boolean; txt: string } | null>(null);
  const [confirmarAnular, setConfirmarAnular] = useState(false);
  const [pending, startTransition] = useTransition();

  const correr = (fn: (fd: FormData) => Promise<{ ok: boolean; error?: string }>, extra: Record<string, string>, exito: string) => {
    setMsg(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("ventaId", ventaId);
      fd.set("pin", pin);
      for (const [k, v] of Object.entries(extra)) fd.set(k, v);
      const r = await fn(fd);
      setMsg({ ok: r.ok, txt: r.ok ? exito : (r.error ?? "No se pudo.") });
      if (r.ok) { setPin(""); setConfirmarAnular(false); }
    });
  };

  const medios = (MEDIOS_PAGO as readonly string[]).filter((m) => m !== "credito");

  return (
    <details className="mt-1">
      <summary className="cursor-pointer text-[11px] font-bold text-slate-400 hover:text-slate-600">✏️ Corregir (con clave)</summary>
      <div className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
        <label className="block text-[11px] font-bold text-slate-500">Clave del dueño
          <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="● ● ● ●" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-sm tracking-widest" />
        </label>

        {/* Cambiar medio de pago */}
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-[11px] font-bold text-slate-500">Cambiar medio
            <select value={medio} onChange={(e) => setMedio(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
              {medios.map((m) => <option key={m} value={m}>{medioPagoLabel[m] ?? m}</option>)}
            </select>
          </label>
          <button type="button" disabled={pending || pin.length < 4}
            onClick={() => correr(cambiarMedioConPin, { medio }, "Medio actualizado ✓")}
            className="shrink-0 rounded-lg bg-sky-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Guardar</button>
        </div>

        {/* Anular */}
        {confirmarAnular ? (
          <div className="flex items-center gap-2">
            <button type="button" disabled={pending || pin.length < 4}
              onClick={() => correr(anularVentaConPin, {}, "Venta anulada ✓")}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-40">Sí, anular (repone stock)</button>
            <button type="button" onClick={() => setConfirmarAnular(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500">cancelar</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmarAnular(true)}
            className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-bold text-red-600 active:bg-red-50">🗑️ Anular venta</button>
        )}

        {msg && <p className={`text-xs font-bold ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.txt}</p>}
      </div>
    </details>
  );
}
