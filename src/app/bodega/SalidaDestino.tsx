"use client";

import { useEffect, useRef, useState } from "react";
import { registrarSalidaDestino } from "./actions";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};
type Fila = { key: number; nombre: string; cantidad: string };

const NUM: Record<string, number> = {
  un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, docena: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100, ciento: 100, mil: 1000,
};
function parseItems(txt: string): { nombre: string; cantidad: number }[] {
  const out: { nombre: string; cantidad: number }[] = [];
  for (const parte of txt.toLowerCase().split(/,| y /)) {
    const toks = parte.trim().replace(/[.]/g, "").split(/\s+/).filter(Boolean);
    let cant = 0; const resto: string[] = [];
    for (const t of toks) { if (/^\d+$/.test(t)) cant += +t; else if (NUM[t] != null) cant += NUM[t]; else resto.push(t); }
    const nombre = resto.join(" ").trim();
    if (nombre && cant > 0) out.push({ nombre, cantidad: cant });
  }
  return out;
}

/** Salió de bodega PARA alguien. Captura ítems + destino (voz: "20 tú y yo para don Juan"). */
export default function SalidaDestino({ catalogo = [], clientes = [] }: { catalogo?: { id: string; nombre: string }[]; clientes?: string[] }) {
  const [destino, setDestino] = useState("");
  const [filas, setFilas] = useState<Fila[]>([{ key: 1, nombre: "", cantidad: "" }]);
  const [enviando, setEnviando] = useState(false);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    recRef.current = rec;
  }, []);

  const setFila = (key: number, patch: Partial<Fila>) => setFilas((f) => f.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const addFila = () => setFilas((f) => [...f, { key: Date.now(), nombre: "", cantidad: "" }]);
  const delFila = (key: number) => setFilas((f) => (f.length > 1 ? f.filter((x) => x.key !== key) : f));

  function dictar() {
    const rec = recRef.current;
    if (!rec || escuchando) return;
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      const m = t.toLowerCase().split(/\bpara\b/);
      const items = parseItems(m[0] ?? t);
      if (m[1]) setDestino(m[1].replace(/^\s*(el|la|los|las)\s+/, "").trim());
      if (items.length) setFilas((f) => {
        const limpias = f.filter((x) => x.nombre.trim() || x.cantidad.trim());
        return [...limpias, ...items.map((it, i) => ({ key: Date.now() + i, nombre: it.nombre, cantidad: String(it.cantidad) }))];
      });
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  }

  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const items = filas
    .map((f) => {
      const cantidad = Number(f.cantidad.replace(/[^0-9]/g, "")) || 0;
      const match = catalogo.find((c) => norm(c.nombre) === norm(f.nombre)) ?? catalogo.find((c) => norm(c.nombre).includes(norm(f.nombre)) && f.nombre.trim().length > 2);
      return match && cantidad > 0 ? { id: match.id, nombre: match.nombre, cantidad } : null;
    })
    .filter((x): x is { id: string; nombre: string; cantidad: number } => !!x);
  const listo = items.length > 0;

  async function guardar() {
    if (!listo || enviando) return;
    setEnviando(true);
    const fd = new FormData();
    fd.set("destino", destino.trim());
    fd.set("items", JSON.stringify(items));
    try { await registrarSalidaDestino(fd); } finally { setEnviando(false); }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-slate-700">¿Para quién / a dónde salió?
        <input value={destino} onChange={(e) => setDestino(e.target.value)} list="clientes-sug" placeholder="Ej: don Juan, ruta sur, almacén X"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
        <datalist id="clientes-sug">{clientes.map((c) => <option key={c} value={c} />)}</datalist>
      </label>

      {soportado && (
        <button type="button" onClick={dictar} disabled={escuchando}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white"
          style={{ background: escuchando ? "#ef4444" : "#b45309" }}>
          🎙️ {escuchando ? "Escuchando… habla" : "Dictar (ej: “veinte tú y yo para don Juan”)"}
        </button>
      )}

      <datalist id="cat-salida">{catalogo.map((c) => <option key={c.id} value={c.nombre} />)}</datalist>
      <div className="space-y-2">
        {filas.map((f) => (
          <div key={f.key} className="flex items-center gap-2">
            <input value={f.nombre} onChange={(e) => setFila(f.key, { nombre: e.target.value })} list="cat-salida" placeholder="Producto / sabor"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
            <input value={f.cantidad} onChange={(e) => setFila(f.key, { cantidad: e.target.value })} inputMode="numeric" placeholder="Cant."
              className="w-20 rounded-lg border border-slate-300 px-2 py-2.5 text-right text-sm font-semibold" />
            <button type="button" onClick={() => delFila(f.key)} aria-label="Quitar" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-red-500 active:bg-red-50">✕</button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addFila} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 active:bg-slate-200">+ Otro</button>

      <button type="button" onClick={guardar} disabled={!listo || enviando}
        className="w-full rounded-xl bg-[#b45309] py-3 text-sm font-extrabold text-white disabled:opacity-40">
        {enviando ? "Guardando…" : "Registrar salida"}
      </button>
      <p className="text-[11px] text-slate-400">Descuenta de bodega y queda pendiente en la central para confirmar a dónde fue (si se vendió → venta).</p>
    </div>
  );
}
