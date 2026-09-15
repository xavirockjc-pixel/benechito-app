"use client";

import { useState } from "react";

/**
 * Botón "Empezar nuevo día / nuevo cómputo". Guarda lo del día actual como
 * registro oculto (NO borra nada) y arranca el conteo desde cero. Pide
 * confirmación en dos pasos para evitar apretarlo por error.
 */
export default function EmpezarNuevoDia({
  action,
  label,
}: {
  action: (fd: FormData) => Promise<void>;
  label?: string;
}) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <form action={action} className="mt-3">
      {!confirmando ? (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="w-full rounded-xl border-2 border-slate-300 bg-white py-3 text-sm font-extrabold text-slate-700 active:bg-slate-50"
        >
          🔄 {label ?? "Empezar nuevo día (parte de cero)"}
        </button>
      ) : (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-center">
          <p className="text-xs font-semibold text-amber-800">
            Guarda lo del día actual (queda oculto, <b>no se borra</b>) y empieza un cómputo nuevo desde cero. ¿Seguro?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="flex-1 rounded-lg bg-white py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-200 active:bg-slate-50"
            >
              Cancelar
            </button>
            <button type="submit" className="flex-1 rounded-lg bg-amber-600 py-2 text-sm font-extrabold text-white active:brightness-110">
              Sí, empezar nuevo día
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
