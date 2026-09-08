"use client";

import { useEffect, useRef, useState } from "react";
import { registrarMovCajaVecina } from "./actions";
import { TIPOS_CV, cvLabel, cvIcono, detectaTipoCV, detectaMontoCV, normalizaCV } from "@/lib/dominio/caja-vecina";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

export default function MovCajaVecinaForm() {
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [tipo, setTipo] = useState<string>("giro");
  const [monto, setMonto] = useState("");
  const [detalle, setDetalle] = useState("");
  const [foto, setFoto] = useState("");

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const dicho = e.results[0][0].transcript;
      const t = normalizaCV(dicho);
      setTipo(detectaTipoCV(t));
      const m = detectaMontoCV(t); if (m) setMonto(String(m));
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
    <form action={registrarMovCajaVecina} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="foto" value={foto} />
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-800">➕ Registrar movimiento</h2>
        {soportado && (
          <button type="button" onClick={dictar} className={`rounded-lg px-3 py-1.5 text-sm font-bold text-white ${escuchando ? "animate-pulse bg-red-500" : "bg-[#0f7a44]"}`}>
            {escuchando ? "🔴 Escuchando…" : "🎤 Dictar"}
          </button>
        )}
      </div>
      <p className="mb-2 text-[11px] text-slate-400">Di algo como: <i>“giro de 20 mil”</i> o <i>“depósito 15 mil”</i>. Revisa y guarda.</p>

      <div className="grid grid-cols-2 gap-2">
        <label className="col-span-2 flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">Tipo</span>
          <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
            {TIPOS_CV.filter((t) => t !== "apertura").map((t) => <option key={t} value={t}>{cvIcono[t]} {cvLabel[t]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">Monto $</span>
          <input name="monto" value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="numeric" placeholder="0" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" required />
        </label>
        <label className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">Detalle (opcional)</span>
          <input name="detalle" value={detalle} onChange={(e) => setDetalle(e.target.value)} placeholder="nombre / nº" className="rounded-lg border border-slate-300 px-2 py-2 text-sm" />
        </label>
      </div>

      {/* Pantallazo del comprobante */}
      <div className="mt-2 flex items-center gap-2">
        <label className="cursor-pointer rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600">
          📷 Pantallazo
          <input type="file" accept="image/*" capture="environment" onChange={subirFoto} className="hidden" />
        </label>
        {foto && <img src={foto} alt="comprobante" className="h-12 w-12 rounded-lg border border-slate-200 object-cover" />}
        {foto && <button type="button" onClick={() => setFoto("")} className="text-xs text-slate-400 hover:text-red-500">quitar</button>}
      </div>

      <button className="mt-3 w-full rounded-xl bg-[#0f7a44] py-3 text-sm font-extrabold text-white active:brightness-95">Guardar movimiento</button>
    </form>
  );
}
