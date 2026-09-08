"use client";

import { useState } from "react";
import { abrirCajaVecina } from "./actions";
import ContadorEfectivo from "../ContadorEfectivo";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

export default function AbrirCajaVecinaForm() {
  const [efectivo, setEfectivo] = useState(0);
  const [maquina, setMaquina] = useState("");
  const maq = Number(maquina.replace(/[^\d]/g, "")) || 0;

  return (
    <form action={abrirCajaVecina} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
      <h2 className="text-base font-extrabold text-slate-900">🔓 Abrir Caja Vecina</h2>
      <p className="mb-3 text-[12px] text-slate-500">Antes de trabajar, registra lo que tienes: el <b>efectivo disponible</b> y el <b>saldo/cupo de la máquina</b>.</p>

      {/* Efectivo disponible (billetes y monedas) */}
      <p className="text-sm font-bold text-slate-700">💵 Efectivo disponible (cuéntalo):</p>
      <div className="mt-1"><ContadorEfectivo name="efectivo" onChange={setEfectivo} /></div>

      {/* Saldo de la máquina */}
      <label className="mt-3 block text-sm font-bold text-slate-700">🏧 Saldo / cupo de la máquina
        <input
          name="saldoMaquina" value={maquina} onChange={(e) => setMaquina(e.target.value)}
          inputMode="numeric" placeholder="0"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-[#0f7a44]"
        />
      </label>

      {/* Resumen */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-white p-2 shadow-sm">
          <p className="text-base font-extrabold text-emerald-700 tabular-nums">{CLP(efectivo)}</p>
          <p className="text-[10px] font-bold uppercase text-slate-400">Efectivo</p>
        </div>
        <div className="rounded-xl bg-white p-2 shadow-sm">
          <p className="text-base font-extrabold text-sky-700 tabular-nums">{CLP(maq)}</p>
          <p className="text-[10px] font-bold uppercase text-slate-400">Máquina</p>
        </div>
      </div>

      <button className="mt-3 w-full rounded-xl bg-[#0f7a44] py-3 text-base font-extrabold text-white active:brightness-95">
        Abrir caja
      </button>
    </form>
  );
}
