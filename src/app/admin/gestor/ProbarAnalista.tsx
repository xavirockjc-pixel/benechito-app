"use client";

import { useState, useTransition } from "react";
import { probarAnalista } from "./actions";

/** Botón del dueño: arma el resumen del analista ahora y lo manda al Telegram. */
export default function ProbarAnalista() {
  const [pending, startTransition] = useTransition();
  const [res, setRes] = useState<{ enviado: boolean; texto?: string; error?: string } | null>(null);

  const correr = () => {
    setRes(null);
    startTransition(async () => {
      const r = await probarAnalista();
      setRes({ enviado: r.enviado, texto: r.texto, error: r.error });
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-extrabold text-slate-800">🤖 Bot analista</p>
          <p className="text-[11px] text-slate-500">Resumen del día + avisos. Llega solo por Telegram si lo programas.</p>
        </div>
        <button type="button" onClick={correr} disabled={pending}
          className="shrink-0 rounded-lg bg-[#1479c4] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
          {pending ? "…" : "📲 Enviarme ahora"}
        </button>
      </div>
      {res && (
        <div className="mt-2">
          {res.error ? (
            <p className="text-xs font-bold text-red-600">{res.error}</p>
          ) : (
            <>
              <p className="text-xs font-bold text-emerald-600">{res.enviado ? "✓ Enviado a tu Telegram" : "Vista previa (Telegram no configurado)"}</p>
              {res.texto && <pre className="mt-1 whitespace-pre-wrap rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">{res.texto}</pre>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
