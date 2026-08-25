"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { agregarItem } from "./actions";

type Prod = { id: string; nombre: string; formato: string | null };
type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};
const NUMS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, docena: 12, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100 };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function PedidoItemForm({ pedidoId, productos, inputCls }: { pedidoId: string; productos: Prod[]; inputCls: string }) {
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    recRef.current = rec;
  }, []);

  const idx = useMemo(() => productos.map((p) => ({ ...p, n: norm(p.nombre) })), [productos]);

  const interpretar = (texto: string) => {
    const toks = norm(texto).replace(/[.,]/g, " ").split(/\s+/).filter(Boolean);
    let cant = 0;
    const resto: string[] = [];
    for (const t of toks) {
      if (/^\d+$/.test(t)) { cant = parseInt(t, 10); continue; }
      if (NUMS[t] != null && cant === 0) { cant = NUMS[t]; continue; }
      resto.push(t);
    }
    const frase = resto.join(" ");
    const match = idx.find((p) => p.n === frase) ?? idx.find((p) => p.n.includes(frase) || frase.includes(p.n));
    if (match) setProductoId(match.id);
    if (cant > 0) setCantidad(String(cant));
  };

  const escuchar = () => {
    const rec = recRef.current;
    if (!rec || escuchando) return;
    rec.onresult = (e) => interpretar(e.results[0][0].transcript);
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  };

  return (
    <form action={agregarItem} className="space-y-3">
      <input type="hidden" name="pedidoId" value={pedidoId} />
      {soportado && (
        <button type="button" onClick={escuchar} disabled={escuchando}
          className={`flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-extrabold text-white ${escuchando ? "animate-pulse bg-red-500" : "bg-[#0f766e]"}`}>
          🎙️ {escuchando ? "Escuchando…" : "Dictar (ej: “tres frutilla”)"}
        </button>
      )}
      <label className="block text-sm font-bold text-slate-700">Producto
        <select name="productoId" required value={productoId} onChange={(e) => setProductoId(e.target.value)} className={`mt-1 ${inputCls}`}>
          <option value="">Selecciona…</option>
          {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.formato ? ` · ${p.formato}` : ""}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-bold text-slate-700">Cantidad
          <input name="cantidad" value={cantidad} onChange={(e) => setCantidad(e.target.value)} inputMode="numeric" className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-sm font-bold text-slate-700">Precio manual <span className="font-normal text-slate-400">(opcional)</span>
          <input name="precioUnit" inputMode="numeric" placeholder="auto" className={`mt-1 ${inputCls}`} />
        </label>
      </div>
      <button className="w-full rounded-lg bg-naranja px-4 py-2 text-sm font-bold text-white transition hover:brightness-105">Agregar al pedido</button>
    </form>
  );
}
