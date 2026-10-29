"use client";

import { useState } from "react";
import { abrirEfactura } from "@/lib/sii-app";

type Dato = { label: string; value: string; copiable?: boolean };
type LineaNeto = { nombre: string; cantidad: number; netoUnit: number; netoTotal: number };

const clp = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

/**
 * Atajo para EMITIR la factura (modo manual) en la app SII e-Factura: copia los
 * datos de la venta (RUT comprador, neto, IVA, total y detalle) y abre la app
 * para pegarlos. El SII autocompleta el cliente con el RUT.
 */
export default function EmitirSII({ url, datos, detalle, lineas = [] }: { url: string; datos: Dato[]; detalle: string; lineas?: LineaNeto[] }) {
  const [copiado, setCopiado] = useState<string | null>(null);

  const copiar = async (texto: string, clave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(clave);
      setTimeout(() => setCopiado((c) => (c === clave ? null : c)), 1500);
    } catch {
      /* navegador sin permiso: el usuario puede seleccionar a mano */
    }
  };

  const todo = [...datos.filter((d) => d.copiable !== false).map((d) => `${d.label}: ${d.value}`), "", detalle].join("\n");

  const abrirApp = () => {
    copiar(todo, "__todo"); // copia todo primero, para pegar de una en la app
    abrirEfactura(url); // Android: app e-Factura · iOS/PC: web del SII
  };

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
      <p className="text-sm font-extrabold text-sky-800">🧾 Emitir la factura (SII e-Factura)</p>
      <p className="mt-0.5 text-xs text-sky-700">1) Copia los datos · 2) abre la app · 3) pega (el SII autocompleta con el RUT).</p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => copiar(todo, "__todo")}
          className={`rounded-lg py-2.5 text-sm font-extrabold ${copiado === "__todo" ? "bg-green-600 text-white" : "border border-sky-300 bg-white text-sky-700"}`}>
          {copiado === "__todo" ? "✓ Copiado" : "📋 Copiar datos"}
        </button>
        <button type="button" onClick={abrirApp}
          className="rounded-lg bg-sky-700 py-2.5 text-sm font-extrabold text-white active:brightness-110">
          📲 Abrir e-Factura
        </button>
      </div>

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

      {/* Detalle por producto en valores NETOS (sin IVA) — para pegar cada línea */}
      {lineas.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Detalle — neto por producto (sin IVA)</p>
          <div className="mt-1 space-y-1.5">
            {lineas.map((l, i) => (
              <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{l.cantidad}× {l.nombre}</p>
                  <p className="text-[11px] text-slate-400">neto c/u {clp(l.netoUnit)} · línea {clp(l.netoTotal)}</p>
                </div>
                <button type="button" onClick={() => copiar(String(l.netoUnit), `l${i}`)}
                  className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-extrabold ${copiado === `l${i}` ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                  {copiado === `l${i}` ? "✓" : "Copiar neto"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <a href={url} target="_blank" rel="noopener noreferrer"
        className="mt-2 block text-center text-[11px] font-semibold text-sky-600 underline">
        o emitir en la web del SII ↗
      </a>
    </div>
  );
}
