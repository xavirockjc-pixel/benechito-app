"use client";

import { useState } from "react";

type Dato = { label: string; value: string; copiable?: boolean };

/**
 * Atajo para EMITIR la factura en el SII (modo manual): abre el sistema de
 * facturación gratuito del SII y deja los datos de la venta listos para copiar
 * y pegar (RUT del comprador, neto, IVA, total y detalle). Así en el portal /
 * app E-factura solo se pega, sin re-digitar.
 */
export default function EmitirSII({ url, datos, detalle }: { url: string; datos: Dato[]; detalle: string }) {
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiar = async (texto: string, clave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      setTimeout(() => setCopiado((c) => (c === clave ? null : c)), 1500);
    } catch {
      /* algunos navegadores sin permiso: el usuario puede seleccionar a mano */
    }
  };

  const todo = [...datos.filter((d) => d.copiable !== false).map((d) => `${d.label}: ${d.value}`), "", detalle].join("\n");

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
      <p className="text-sm font-extrabold text-sky-800">🧾 Emitir la factura en el SII</p>
      <p className="mt-0.5 text-xs text-sky-700">Abre el facturador gratuito del SII y pega estos datos (el SII autocompleta con el RUT).</p>

      <a href={url} target="_blank" rel="noopener noreferrer"
        className="mt-2 block rounded-lg bg-sky-700 py-2.5 text-center text-sm font-extrabold text-white active:brightness-110">
        ↗ Abrir SII — Factura electrónica
      </a>

      <div className="mt-3 space-y-1.5">
        {datos.map((d) => (
          <div key={d.label} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{d.label}</p>
              <p className="truncate text-sm font-semibold text-slate-800">{d.value}</p>
            </div>
            <button type="button" onClick={() => copiar(d.value, d.label)}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-extrabold ${copiado === d.label ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              {copiado === d.label ? "✓" : "Copiar"}
            </button>
          </div>
        ))}
      </div>

      <button type="button" onClick={() => copiar(todo, "__todo")}
        className={`mt-2 w-full rounded-lg py-2 text-xs font-extrabold ${copiado === "__todo" ? "bg-green-600 text-white" : "border border-sky-300 bg-white text-sky-700"}`}>
        {copiado === "__todo" ? "✓ Copiado todo" : "📋 Copiar todos los datos"}
      </button>
    </div>
  );
}
