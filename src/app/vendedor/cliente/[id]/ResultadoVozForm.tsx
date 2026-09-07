"use client";

import { useEffect, useRef, useState } from "react";
import { registrarVisitaVoz } from "@/app/vendedor/actions";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

/** Extrae un número (admite "20 mil"). */
function montoCerca(t: string, claves: RegExp): number {
  const m = t.match(claves);
  if (!m) return 0;
  const resto = t.slice(m.index! + m[0].length);
  const num = resto.match(/(\d[\d.]*)\s*(mil)?/);
  if (!num) return 0;
  let v = parseInt(num[1].replace(/\./g, ""), 10) || 0;
  if (num[2] === "mil" && v < 1000) v *= 1000;
  return v;
}

/** Fecha relativa → yyyy-mm-dd. */
function fechaRel(t: string): string {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const iso = (d: Date) => d.toLocaleDateString("en-CA");
  if (/pasado manana/.test(t)) { const d = new Date(hoy); d.setDate(d.getDate() + 2); return iso(d); }
  if (/\bmanana\b/.test(t)) { const d = new Date(hoy); d.setDate(d.getDate() + 1); return iso(d); }
  if (/(proxima semana|otra semana)/.test(t)) { const d = new Date(hoy); d.setDate(d.getDate() + 7); return iso(d); }
  const enDias = t.match(/en (\d+) dias?/); if (enDias) { const d = new Date(hoy); d.setDate(d.getDate() + parseInt(enDias[1], 10)); return iso(d); }
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  for (let i = 0; i < 7; i++) if (t.includes(dias[i])) { const d = new Date(hoy); const diff = (i - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + diff); return iso(d); }
  return "";
}

export default function ResultadoVozForm({ negocioId }: { negocioId: string }) {
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [nota, setNota] = useState("");
  const [compra, setCompra] = useState("");
  const [abono, setAbono] = useState("");
  const [factura, setFactura] = useState(false);
  const [proxima, setProxima] = useState("");

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const dicho = e.results[0][0].transcript;
      const t = norm(dicho);
      setNota((p) => (p ? p + " " : "") + dicho);
      const c = montoCerca(t, /(compr\w*|llev\w*|vend\w*|se llevo)/); if (c) setCompra(String(c));
      const a = montoCerca(t, /(abon\w*|pag\w*|cancel\w*|deja)/); if (a) setAbono(String(a));
      if (/factura/.test(t)) setFactura(true);
      const f = fechaRel(t); if (f) setProxima(f);
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    recRef.current = rec;
  }, []);

  function dictar() {
    if (!recRef.current || escuchando) return;
    try { recRef.current.start(); setEscuchando(true); } catch { /* activo */ }
  }

  const algo = nota.trim() || Number(compra) > 0 || Number(abono) > 0 || factura || proxima;

  return (
    <form action={registrarVisitaVoz} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <input type="hidden" name="negocioId" value={negocioId} />
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-extrabold text-slate-800">🎙️ Resultado de la visita (por voz)</h2>
        {soportado && (
          <button type="button" onClick={dictar} className={`rounded-lg px-3 py-1.5 text-sm font-bold text-white ${escuchando ? "animate-pulse bg-red-500" : "bg-[#1479c4]"}`}>
            {escuchando ? "🔴 Escuchando…" : "🎤 Dictar"}
          </button>
        )}
      </div>
      <p className="mb-2 text-[11px] text-slate-400">Di algo como: <i>“compró 20 mil, abonó 10 mil, quiere factura, vuelvo el lunes”</i>. Revisa y guarda.</p>

      <textarea name="nota" value={nota} onChange={(e) => setNota(e.target.value)} rows={2} placeholder="Nota de la visita…" className="w-full resize-none rounded-lg border border-slate-300 p-2 text-sm outline-none focus:border-[#1479c4]" />

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">🛒 Compró $</span>
          <input name="compra" value={compra} onChange={(e) => setCompra(e.target.value)} inputMode="numeric" placeholder="0" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">💵 Abonó $</span>
          <input name="abono" value={abono} onChange={(e) => setAbono(e.target.value)} inputMode="numeric" placeholder="0" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="flex flex-col gap-0.5"><span className="text-[10px] font-bold uppercase text-slate-400">📅 Próxima visita</span>
          <input type="date" name="proxima" value={proxima} onChange={(e) => setProxima(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" /></label>
        <label className="flex items-end gap-2 pb-1 text-sm font-bold text-slate-700">
          <input type="checkbox" name="factura" checked={factura} onChange={(e) => setFactura(e.target.checked)} className="h-4 w-4 accent-[#1479c4]" /> 🧾 Quiere factura
        </label>
      </div>

      <button disabled={!algo} className="mt-3 w-full rounded-xl bg-green-600 py-3 text-sm font-extrabold text-white active:brightness-95 disabled:opacity-40">
        Guardar visita
      </button>
      {!soportado && <p className="mt-2 text-[11px] text-slate-400">La voz no está disponible aquí; llena los campos a mano.</p>}
    </form>
  );
}
