"use client";

import { useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { cerrarCaja } from "../actions";
import ContadorEfectivo from "../ContadorEfectivo";

export default function CierreCajaForm({ esperado }: { esperado: number }) {
  const [contado, setContado] = useState(0);
  const [apartado, setApartado] = useState("");
  const apartadoN = Number(apartado.replace(/[^\d]/g, "")) || 0;
  const hay = contado > 0 || apartadoN > 0;
  // El dinero apartado también es plata del día: cuadra sumándolo al contado en caja.
  const dif = contado + apartadoN - esperado;

  return (
    <form action={cerrarCaja} className="space-y-3">
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
        <span className="font-semibold text-slate-600">Efectivo esperado en caja</span>
        <span className="font-extrabold text-slate-900">{fmtCLP(esperado)}</span>
      </div>
      <p className="text-sm font-bold text-slate-700">Cuenta el efectivo real (billetes y monedas):</p>
      <ContadorEfectivo name="efectivoContado" onChange={setContado} />

      {/* Dinero apartado: lo que guardaste aparte (no está en el cajón) */}
      <label className="block rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
        💰 Dinero apartado (guardado aparte)
        <input name="efectivoApartado" value={apartado} onChange={(e) => setApartado(e.target.value)} inputMode="numeric" placeholder="0"
          className="mt-1 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 font-normal text-slate-800 outline-none focus:border-amber-500" />
        <span className="mt-1 block text-[11px] font-normal text-amber-700">Plata que sacaste y guardaste aparte (para depósito, reserva, etc.). No está en la caja, pero es del día.</span>
      </label>

      {(contado > 0 || apartadoN > 0) && (
        <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="font-semibold text-slate-600">En caja {fmtCLP(contado)}{apartadoN > 0 ? ` + apartado ${fmtCLP(apartadoN)}` : ""}</span>
          <span className="font-extrabold text-slate-900">{fmtCLP(contado + apartadoN)}</span>
        </div>
      )}
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
