"use client";

import { useState } from "react";

/** Botón "Deshacer" con confirmación, para no borrar por accidente. */
export default function DeshacerBtn({ action, id, que }: { action: (fd: FormData) => void; id: string; que: string }) {
  const [confirmar, setConfirmar] = useState(false);

  if (!confirmar) {
    return (
      <button type="button" onClick={() => setConfirmar(true)}
        className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-red-400 hover:text-red-600">
        ↩︎ Deshacer
      </button>
    );
  }
  return (
    <form action={action} className="flex shrink-0 items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <span className="text-[11px] font-semibold text-slate-500">¿Deshacer {que}?</span>
      <button className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-extrabold text-white active:brightness-110">Sí</button>
      <button type="button" onClick={() => setConfirmar(false)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-bold text-slate-500">No</button>
    </form>
  );
}
