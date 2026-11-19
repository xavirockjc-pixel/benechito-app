"use client";

import { useState } from "react";
import { abrirCajaVecina } from "./actions";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (s: string) => Number((s || "").replace(/[^\d]/g, "")) || 0;

/**
 * Abrir la Caja Vecina del día: cuánto EFECTIVO hay para giros, cuánto CUPO queda
 * en la máquina para recibir, y una FOTO del cupo/pantalla de la máquina.
 */
export default function AbrirCajaVecinaForm() {
  const [efectivo, setEfectivo] = useState("");
  const [maquina, setMaquina] = useState("");
  const [foto, setFoto] = useState("");

  function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1000;
        const escala = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        setFoto(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  return (
    <form action={abrirCajaVecina} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm">
      <input type="hidden" name="foto" value={foto} />
      <h2 className="text-base font-extrabold text-slate-900">🔓 Abrir Caja Vecina</h2>
      <p className="mb-3 text-[12px] text-slate-500">Al llegar: cuánto efectivo tienes para giros, cuánto cupo queda para recibir y una foto de la máquina.</p>

      <label className="block text-sm font-bold text-slate-700">💵 Efectivo para giros
        <input name="efectivo" value={efectivo} onChange={(e) => setEfectivo(e.target.value)}
          inputMode="numeric" placeholder="0"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-lg font-bold text-slate-800 outline-none focus:border-[#0f7a44]" />
      </label>

      <label className="mt-3 block text-sm font-bold text-slate-700">🏧 Cupo que queda para recibir <span className="font-normal text-slate-400">(de la máquina)</span>
        <input name="saldoMaquina" value={maquina} onChange={(e) => setMaquina(e.target.value)}
          inputMode="numeric" placeholder="0"
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#0f7a44]" />
      </label>

      {/* Foto del cupo / pantalla de la máquina */}
      <div className="mt-3 flex items-center gap-2">
        <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-600">
          📷 Foto del cupo
          <input type="file" accept="image/*" capture="environment" onChange={subirFoto} className="hidden" />
        </label>
        {foto && <img src={foto} alt="cupo máquina" className="h-12 w-12 rounded-lg border border-slate-200 object-cover" />}
        {foto && <button type="button" onClick={() => setFoto("")} className="text-xs text-slate-400 hover:text-red-500">quitar</button>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-white p-2 shadow-sm">
          <p className="text-base font-extrabold text-emerald-700 tabular-nums">{CLP(num(efectivo))}</p>
          <p className="text-[10px] font-bold uppercase text-slate-400">Efectivo giros</p>
        </div>
        <div className="rounded-xl bg-white p-2 shadow-sm">
          <p className="text-base font-extrabold text-sky-700 tabular-nums">{CLP(num(maquina))}</p>
          <p className="text-[10px] font-bold uppercase text-slate-400">Cupo recibir</p>
        </div>
      </div>

      <button className="mt-3 w-full rounded-xl bg-[#0f7a44] py-3 text-base font-extrabold text-white active:brightness-95">
        Abrir caja
      </button>
    </form>
  );
}
