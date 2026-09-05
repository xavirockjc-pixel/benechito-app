"use client";

import { useActionState, useEffect, useRef } from "react";
import { cambiarPassword, type CambioPassState } from "./actions";

/** Formulario de cambio de contraseña con confirmación visible ("✓ actualizada"). */
export default function CambiarPasswordForm({ id, inputCls }: { id: string; inputCls: string }) {
  const [state, action, pending] = useActionState<CambioPassState, FormData>(cambiarPassword, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="mt-2 flex flex-wrap items-end gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="text-xs font-bold text-slate-600">Nueva contraseña
        <input name="password" type="text" minLength={6} placeholder="mín. 6 caracteres" className={`mt-1 ${inputCls}`} />
      </label>
      <button disabled={pending} className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {pending ? "Guardando…" : "Cambiar clave"}
      </button>
      {state && (
        <span className={`text-xs font-semibold ${state.ok ? "text-emerald-600" : "text-rose-600"}`}>{state.msg}</span>
      )}
    </form>
  );
}
