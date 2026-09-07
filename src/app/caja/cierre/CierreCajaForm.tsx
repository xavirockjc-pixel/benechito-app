"use client";

import { useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { cerrarCaja } from "../actions";
import ContadorEfectivo from "../ContadorEfectivo";

export default function CierreCajaForm({ esperado }: { esperado: number }) {
  const [contado, setContado] = useState(0);
  const hay = contado > 0;
  const dif = contado - esperado;

  return (
    <form action={cerrarCaja} className="space-y-3">
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span className="font-semibold text-slate-600">Efectivo esperado en caja</span>
        <span className="font-extrabold text-slate-900">{fmtCLP(esperado)}</span>
      </div>
      <p className="text-sm font-bold text-slate-700">Cuenta el efectivo real (billetes y monedas):</p>
      <ContadorEfectivo name="efectivoContado" onChange={setContado} />
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
