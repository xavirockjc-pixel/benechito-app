"use client";

import { useState, useTransition } from "react";
import { guardarCajaPin } from "./correccionesVenta";

/** El dueño configura la clave (PIN) para autorizar correcciones de ventas. */
export default function ConfigCajaPin({ configurada }: { configurada: boolean }) {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const guardar = () => {
    setMsg(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("pin", pin);
      const r = await guardarCajaPin(fd);
      setMsg(r.ok ? "Clave guardada ✓" : (r.error ?? "No se pudo."));
      if (r.ok) setPin("");
    });
  };

  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-extrabold text-slate-800">🔒 Clave de correcciones {configurada ? <span className="text-[11px] font-normal text-emerald-600">· configurada</span> : <span className="text-[11px] font-normal text-amber-600">· sin configurar</span>}</summary>
      <p className="mt-2 text-xs text-slate-500">Esta clave autoriza <b>anular</b> o <b>cambiar el medio</b> de una venta, en la Caja y aquí. Solo el dueño la define.</p>
      <div className="mt-2 flex items-end gap-2">
        <label className="min-w-0 flex-1 text-[11px] font-bold text-slate-500">Nueva clave (4 a 8 dígitos)
          <input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="● ● ● ●" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-sm tracking-widest" />
        </label>
        <button type="button" disabled={pending || pin.length < 4} onClick={guardar}
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Guardar</button>
      </div>
      {msg && <p className="mt-1 text-xs font-bold text-emerald-600">{msg}</p>}
    </details>
  );
}
