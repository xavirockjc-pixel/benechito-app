"use client";

import { useState } from "react";
import ContadorEfectivo from "./ContadorEfectivo";

/**
 * Al abrir caja, deja elegir entre poner el MONTO TOTAL (rápido) o CONTAR
 * billete por billete (detallado). Ambos dejan el total en el input `fondo`.
 */
export default function AbrirCajaEfectivo() {
  const [modo, setModo] = useState<"total" | "detalle">("total");
  const [monto, setMonto] = useState("");

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setModo("total")}
          className={`rounded-xl border-2 py-2 text-sm font-bold ${modo === "total" ? "border-[#0f7a44] bg-green-50 text-[#0f7a44]" : "border-slate-200 bg-white text-slate-500"}`}>
          💵 Monto total
        </button>
        <button type="button" onClick={() => setModo("detalle")}
          className={`rounded-xl border-2 py-2 text-sm font-bold ${modo === "detalle" ? "border-[#0f7a44] bg-green-50 text-[#0f7a44]" : "border-slate-200 bg-white text-slate-500"}`}>
          🧮 Contar detallado
        </button>
      </div>

      {modo === "total" ? (
        <label className="block text-sm font-bold text-slate-700">¿Cuánto efectivo de cambio tienes?
          <input value={monto} onChange={(e) => setMonto(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="Ej: 20000"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base font-bold" />
          <input type="hidden" name="fondo" value={monto} />
        </label>
      ) : (
        <ContadorEfectivo name="fondo" />
      )}
    </div>
  );
}
