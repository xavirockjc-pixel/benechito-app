"use client";

import { useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";

/** Compara el efectivo esperado con el que el vendedor dice entregar. */
export default function CuadreCaja({ esperado }: { esperado: number }) {
  const [rendido, setRendido] = useState("");
  const n = Number(rendido);
  const hay = rendido.trim() !== "" && Number.isFinite(n);
  const dif = hay ? n - esperado : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">Efectivo esperado</span>
        <span className="font-bold text-slate-900">{fmtCLP(esperado)}</span>
      </div>
      <label className="block text-sm font-bold text-slate-700">
        Efectivo que entrego
        <input
          type="number"
          inputMode="numeric"
          value={rendido}
          onChange={(e) => setRendido(e.target.value)}
          placeholder="0"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#1479c4]"
        />
      </label>
      {hay && (
        <div
          className={`rounded-lg px-3 py-2 text-center text-sm font-bold ${
            dif === 0 ? "bg-green-100 text-green-700" : dif > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
          }`}
        >
          {dif === 0 ? "Cuadra exacto ✓" : dif > 0 ? `Sobran ${fmtCLP(dif)}` : `Faltan ${fmtCLP(-dif)}`}
        </div>
      )}
    </div>
  );
}
