"use client";

import { useEffect, useRef, useState } from "react";
import { LINEAS_PRODUCCION, lineaLabel } from "@/lib/dominio/produccion";
import { registrarProduccion } from "./actions";

type Fila = { key: number; nombre: string; cantidad: string };

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

const NUMS: Record<string, number> = {
  cero: 0, un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, docena: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100,
};

/** Extrae pares (cantidad, sabor) de una frase: "treinta frutilla, veinte pistacho". */
function parsearProduccion(texto: string): { nombre: string; cantidad: number }[] {
  const partes = texto.toLowerCase().split(/,| y /);
  const out: { nombre: string; cantidad: number }[] = [];
  for (const parte of partes) {
    const toks = parte.trim().replace(/[.]/g, "").split(/\s+/).filter(Boolean);
    let cant = 0;
    const resto: string[] = [];
    for (const t of toks) {
      if (/^\d+$/.test(t)) { cant = parseInt(t, 10); continue; }
      if (NUMS[t] != null && cant === 0) { cant = NUMS[t]; continue; }
      resto.push(t);
    }
    const nombre = resto.join(" ").trim();
    if (nombre && cant > 0) out.push({ nombre, cantidad: cant });
  }
  return out;
}

/**
 * Anota lo que se produjo: eliges el TIPO y agregas líneas "sabor + cuántos".
 * Los sabores del tipo aparecen para elegir (o se escribe/dicta uno nuevo).
 */
export default function ProduccionForm({ saboresPorLinea = {} }: { saboresPorLinea?: Record<string, string[]> }) {
  const [linea, setLinea] = useState<string>(LINEAS_PRODUCCION[0]);
  const saboresTipo = saboresPorLinea[linea] ?? [];
  const [filas, setFilas] = useState<Fila[]>([{ key: 1, nombre: "", cantidad: "" }]);
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    recRef.current = rec;
  }, []);

  const setFila = (key: number, patch: Partial<Fila>) => setFilas((f) => f.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const addFila = () => setFilas((f) => [...f, { key: Date.now() + f.length, nombre: "", cantidad: "" }]);
  const delFila = (key: number) => setFilas((f) => (f.length > 1 ? f.filter((x) => x.key !== key) : f));

  const escuchar = () => {
    const rec = recRef.current;
    if (!rec || escuchando) return;
    rec.onresult = (e) => {
      const items = parsearProduccion(e.results[0][0].transcript);
      if (items.length) setFilas((f) => {
        const limpias = f.filter((x) => x.nombre.trim() || x.cantidad.trim());
        return [...limpias, ...items.map((it, i) => ({ key: Date.now() + i, nombre: it.nombre, cantidad: String(it.cantidad) }))];
      });
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  };

  const items = filas
    .map((f) => ({ nombre: f.nombre.trim(), cantidad: Number(f.cantidad.replace(/[^0-9]/g, "")) || 0 }))
    .filter((i) => i.nombre && i.cantidad > 0);
  const total = items.reduce((s, i) => s + i.cantidad, 0);

  return (
    <form action={registrarProduccion} className="space-y-3">
      <input type="hidden" name="linea" value={linea} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <label className="block text-sm font-bold text-slate-700">Tipo de producto
        <select value={linea} onChange={(e) => setLinea(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#0f766e]">
          {LINEAS_PRODUCCION.map((l) => <option key={l} value={l}>{lineaLabel[l] ?? l}</option>)}
        </select>
      </label>

      {soportado && (
        <button type="button" onClick={escuchar} disabled={escuchando}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white ${escuchando ? "animate-pulse bg-red-500" : "bg-[#0f766e]"}`}>
          🎙️ {escuchando ? "Escuchando… habla" : "Dictar (ej: “treinta frutilla, veinte pistacho”)"}
        </button>
      )}

      <datalist id={`sabores-${linea}`}>{saboresTipo.map((s) => <option key={s} value={s} />)}</datalist>
      <div className="space-y-2">
        {filas.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <input value={f.nombre} onChange={(e) => setFila(f.key, { nombre: e.target.value })} list={`sabores-${linea}`} placeholder="Sabor (elige o escribe)"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-800" />
            <input value={f.cantidad} onChange={(e) => setFila(f.key, { cantidad: e.target.value })} inputMode="numeric" placeholder="Cant."
              className="w-20 rounded-lg border border-slate-300 px-2 py-2.5 text-right text-sm font-semibold" />
            <button type="button" onClick={() => delFila(f.key)} className="shrink-0 text-xs font-bold text-red-500">✕</button>
          </div>
        ))}
      </div>
      {saboresTipo.length > 0 && <p className="text-[11px] text-slate-400">💡 {saboresTipo.length} sabores de {lineaLabel[linea] ?? linea} disponibles al tocar el campo.</p>}

      <button type="button" onClick={addFila} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 active:bg-slate-200">
        + Otro sabor
      </button>

      <button disabled={total === 0}
        className="w-full rounded-xl bg-[#0f766e] py-3 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40">
        Registrar producción {total > 0 ? `(${total} u.)` : ""}
      </button>
    </form>
  );
}
