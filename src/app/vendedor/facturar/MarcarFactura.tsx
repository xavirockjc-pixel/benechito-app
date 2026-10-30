"use client";

import { useState } from "react";
import { marcarFacturadaRuta } from "../actions";

/**
 * Marca una factura como hecha y la envía al cliente desde el número Benechito.
 * Opcional: adjuntar el PDF/foto de la factura (se convierte a dataURL y viaja al
 * servidor, que lo manda por WhatsApp central). Folio opcional.
 */
export default function MarcarFactura({ ventaId, waFallback }: { ventaId: string; waFallback: string | null }) {
  const [archivo, setArchivo] = useState("");
  const [nombre, setNombre] = useState("");

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => { setArchivo(String(r.result)); setNombre(f.name); };
    r.readAsDataURL(f);
  }

  return (
    <form action={marcarFacturadaRuta} className="space-y-2">
      <input type="hidden" name="ventaId" value={ventaId} />
      <input type="hidden" name="archivo" value={archivo} />
      <div className="flex gap-2">
        <input name="folio" inputMode="numeric" placeholder="N° folio (opcional)"
          className="w-28 rounded-lg border border-slate-300 px-2.5 py-2 text-sm" />
        <label className="flex-1 cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-center text-sm font-bold text-slate-600">
          {nombre ? `📎 ${nombre.length > 18 ? nombre.slice(0, 16) + "…" : nombre}` : "📎 Adjuntar PDF/foto"}
          <input type="file" accept="application/pdf,image/*" onChange={pick} className="hidden" />
        </label>
      </div>
      <button className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-extrabold text-white active:brightness-95">
        ✓ Facturada — enviar al cliente
      </button>
      <p className="text-center text-[11px] text-slate-400">Se envía desde el número Benechito. Adjunta el PDF para que le llegue la factura.</p>
      {waFallback && (
        <a href={waFallback} target="_blank" rel="noopener noreferrer" className="block text-center text-[11px] text-slate-400 underline">
          o abrir mi WhatsApp (si aún no está conectado el número central)
        </a>
      )}
    </form>
  );
}
