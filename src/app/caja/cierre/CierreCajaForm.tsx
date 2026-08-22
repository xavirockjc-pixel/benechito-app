"use client";

import { useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { cerrarCaja } from "../actions";

export default function CierreCajaForm({ esperado }: { esperado: number }) {
  const [contado, setContado] = useState("");
  const n = Number(contado);
  const hay = contado.trim() !== "" && Number.isFinite(n);
  const dif = hay ? n - esperado : 0;

  return (
    <form action={cerrarCaja} className="space-y-3">
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span className="font-semibold text-slate-600">Efectivo esperado en caja</span>
        <span className="font-extrabold text-slate-900">{fmtCLP(esperado)}</span>
      </div>
      <label className="block text-sm font-bold text-slate-700">Efectivo contado (real)
        <input type="number" name="efectivoContado" min="0" step="1" required inputMode="numeric"
          value={contado} onChange={(e) => setContado(e.target.value)} placeholder="0"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-lg font-semibold text-slate-800 outline-none focus:border-[#0f7a44]" />
      </label>
      {hay && (
        <div className={`rounded-lg px-3 py-2 text-center text-sm font-bold ${dif === 0 ? "bg-green-100 text-green-700" : dif > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
          {dif === 0 ? "Cuadra exacto ✓" : dif > 0 ? `Sobran ${fmtCLP(dif)}` : `Faltan ${fmtCLP(-dif)}`}
        </div>
      )}
      <label className="block text-sm font-bold text-slate-700">Notas (opcional)
        <input name="notas" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-[#0f7a44]" />
      </label>
      <button className="w-full rounded-xl bg-slate-900 py-3 text-base font-extrabold text-white active:brightness-110">
        Cerrar caja
      </button>
    </form>
  );
}
