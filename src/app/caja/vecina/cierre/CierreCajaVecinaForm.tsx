"use client";

import { useState } from "react";
import { cerrarCajaVecina } from "../actions";
import ContadorEfectivo from "../../ContadorEfectivo";
import EnviarWhatsApp from "@/components/EnviarWhatsApp";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

export default function CierreCajaVecinaForm({
  efectivoEsperado, saldoApertura, hoyTxt,
}: { efectivoEsperado: number; saldoApertura: number; hoyTxt: string }) {
  const [contado, setContado] = useState(0);
  const [maquinaFinal, setMaquinaFinal] = useState("");

  const maqFinal = Number(maquinaFinal.replace(/[^\d]/g, "")) || 0;
  const difEfectivo = contado - efectivoEsperado;
  const difMaquina = maqFinal - saldoApertura;
  const hayEfectivo = contado > 0;
  const hayMaquina = maquinaFinal !== "";

  const resumen =
    `🔒 Cierre Caja Vecina — ${hoyTxt}\n\n` +
    `💵 Efectivo esperado: ${CLP(efectivoEsperado)}\n` +
    `💵 Efectivo contado: ${CLP(contado)}\n` +
    `${difEfectivo === 0 ? "✓ Cuadra" : difEfectivo > 0 ? `⚠️ Sobran ${CLP(difEfectivo)}` : `⚠️ Faltan ${CLP(-difEfectivo)}`}\n\n` +
    `🏧 Máquina apertura: ${CLP(saldoApertura)}\n` +
    `🏧 Máquina final: ${CLP(maqFinal)}\n` +
    `Movimiento máquina: ${difMaquina >= 0 ? "+" : "−"}${CLP(Math.abs(difMaquina))}`;

  return (
    <div className="space-y-4">
      <form action={cerrarCajaVecina} className="space-y-4">
        {/* Efectivo */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="font-semibold text-slate-600">💵 Efectivo esperado</span>
            <span className="font-extrabold text-slate-900">{CLP(efectivoEsperado)}</span>
          </div>
          <p className="mt-3 text-sm font-bold text-slate-700">Cuenta el efectivo real (billetes y monedas):</p>
          <div className="mt-1"><ContadorEfectivo name="efectivoContado" onChange={setContado} /></div>
          {hayEfectivo && (
            <div className={`mt-2 rounded-lg px-3 py-2 text-center text-sm font-bold ${difEfectivo === 0 ? "bg-green-100 text-green-700" : difEfectivo > 0 ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
              {difEfectivo === 0 ? "Cuadra exacto ✓" : difEfectivo > 0 ? `Sobran ${CLP(difEfectivo)}` : `Faltan ${CLP(-difEfectivo)}`}
            </div>
          )}
        </section>

        {/* Máquina */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
            <span className="font-semibold text-slate-600">🏧 Saldo máquina en la apertura</span>
            <span className="font-extrabold text-slate-900">{CLP(saldoApertura)}</span>
          </div>
          <label className="mt-3 block text-sm font-bold text-slate-700">🏧 Saldo final de la máquina (léelo ahora)
            <input
              name="saldoMaquinaFinal" value={maquinaFinal} onChange={(e) => setMaquinaFinal(e.target.value)}
              inputMode="numeric" placeholder="0"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-[#0f7a44]"
            />
          </label>
          {hayMaquina && (
            <div className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-center text-sm font-bold text-violet-700">
              Movimiento de la máquina: {difMaquina >= 0 ? "+" : "−"}{CLP(Math.abs(difMaquina))}
            </div>
          )}
        </section>

        <label className="block text-sm font-bold text-slate-700">Notas (opcional)
          <input name="notas" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-[#0f7a44]" />
        </label>

        <button className="w-full rounded-xl bg-slate-900 py-3 text-base font-extrabold text-white active:brightness-110">
          🔒 Cerrar Caja Vecina
        </button>
      </form>

      {/* Enviar cierre por WhatsApp */}
      <EnviarWhatsApp texto={resumen} />
    </div>
  );
}
