"use client";

import { useEffect, useRef, useState } from "react";
import { movimientoCaja } from "./actions";
import { MOTIVOS_CAJA, motivoDe, normalizaCajaMov, detectaMotivoCaja, detectaMontoCaja } from "@/lib/dominio/caja-mov";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

export default function MovCajaLocalForm() {
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [tipo, setTipo] = useState<"ingreso" | "egreso">("egreso");
  const [motivoKey, setMotivoKey] = useState("compra");
  const [detalle, setDetalle] = useState("");
  const [monto, setMonto] = useState("");

  const motivos = MOTIVOS_CAJA.filter((m) => m.tipo === tipo);
  const motivo = motivoDe(motivoKey);
  const esGasto = tipo === "egreso" && Boolean(motivo?.gasto);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const dicho = e.results[0][0].transcript;
      const t = normalizaCajaMov(dicho);
      const mk = detectaMotivoCaja(t);
      const m = motivoDe(mk);
      if (m) { setTipo(m.tipo); setMotivoKey(m.key); }
      const val = detectaMontoCaja(t); if (val) setMonto(String(val));
      setDetalle((p) => (p ? p + " " : "") + dicho);
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    recRef.current = rec;
  }, []);

  function dictar() {
    if (!recRef.current || escuchando) return;
    try { recRef.current.start(); setEscuchando(true); } catch { /* activo */ }
  }

  function cambiarTipo(t: "ingreso" | "egreso") {
    setTipo(t);
    setMotivoKey(MOTIVOS_CAJA.find((m) => m.tipo === t)?.key ?? "");
  }

  const conceptoFinal = `${motivo?.label ?? ""}${detalle ? " · " + detalle : ""}`.trim();
  const montoNum = Number(monto.replace(/[^\d]/g, "")) || 0;

  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-extrabold text-slate-800">💵 Movimiento de dinero (agregar o sacar)</summary>

      <form action={movimientoCaja} className="mt-3">
        <input type="hidden" name="tipo" value={tipo} />
        <input type="hidden" name="concepto" value={conceptoFinal} />
        <input type="hidden" name="esGasto" value={esGasto ? "1" : "0"} />
        <input type="hidden" name="categoria" value={motivo?.categoria ?? "otros"} />

        {/* Entra / Sale */}
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => cambiarTipo("ingreso")}
            className={`rounded-xl border py-2.5 text-sm font-extrabold ${tipo === "ingreso" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
            ➕ Entra dinero
          </button>
          <button type="button" onClick={() => cambiarTipo("egreso")}
            className={`rounded-xl border py-2.5 text-sm font-extrabold ${tipo === "egreso" ? "border-rose-500 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-500"}`}>
            ➖ Sale dinero
          </button>
        </div>

        {/* Motivo */}
        <div className="mt-3 flex flex-wrap gap-2">
          {motivos.map((m) => (
            <button type="button" key={m.key} onClick={() => setMotivoKey(m.key)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${motivoKey === m.key ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600"}`}>
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* Voz + detalle + monto */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Di: <i>“compra de 5 mil en bolsas”</i></span>
          {soportado && (
            <button type="button" onClick={dictar} className={`rounded-lg px-3 py-1.5 text-sm font-bold text-white ${escuchando ? "animate-pulse bg-red-500" : "bg-[#0f7a44]"}`}>
              {escuchando ? "🔴 Escuchando…" : "🎤 Dictar"}
            </button>
          )}
        </div>

        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <input value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="detalle (opcional)"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="numeric" placeholder="$ monto" required
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        {esGasto && <p className="mt-2 text-[11px] font-semibold text-amber-600">🧾 Queda también como gasto del local.</p>}

        <button className={`mt-3 w-full rounded-xl py-3 text-sm font-extrabold text-white active:brightness-95 ${tipo === "ingreso" ? "bg-emerald-600" : "bg-rose-600"}`}>
          {tipo === "ingreso" ? "➕ Agregar" : "➖ Sacar"} {montoNum > 0 ? CLP(montoNum) : ""}
        </button>
      </form>
    </details>
  );
}
