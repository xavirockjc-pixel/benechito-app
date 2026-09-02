"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { registrarMovimiento } from "./actions";

type Item = { id: string; nombre: string };
type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

const NUM: Record<string, number> = {
  cero: 0, un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
  nueve: 9, diez: 10, once: 11, doce: 12, docena: 12, quince: 15, veinte: 20, treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100,
};
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const MODOS = [
  { k: "ingreso", label: "➕ Ingresar", desc: "Entró stock (compra/producción)", verbo: "Ingresar", color: "#2f9e44" },
  { k: "merma", label: "➖ Quitar", desc: "Se perdió, rompió o salió sin anotar", verbo: "Quitar", color: "#e23b2c" },
  { k: "ajuste", label: "🎯 Corregir", desc: "Fijar la cantidad real (después de contar)", verbo: "Corregir a", color: "#1479c4" },
  { k: "transferencia", label: "🔄 Transferir", desc: "Mover entre ubicaciones", verbo: "Transferir", color: "#7c3aed" },
];

export default function AjusteStockVoz({ productos, ubicaciones, stockMap }: {
  productos: Item[]; ubicaciones: Item[]; stockMap: Record<string, number>;
}) {
  const unaUbic = ubicaciones.length === 1 ? ubicaciones[0].id : "";
  const [modo, setModo] = useState("merma");
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [origen, setOrigen] = useState(unaUbic);
  const [destino, setDestino] = useState(unaUbic);
  const [dijo, setDijo] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [soportado, setSoportado] = useState(true);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    recRef.current = rec;
  }, []);

  // Ubicación relevante según el modo (para mostrar stock actual).
  const ubicRef = modo === "merma" || modo === "transferencia" ? origen : destino;
  const stockActual = productoId && ubicRef ? (stockMap[`${productoId}:${ubicRef}`] ?? 0) : null;

  const interpretar = (texto: string) => {
    setDijo(texto);
    const t = norm(texto);
    // Acción
    if (/(quita|saca|sacar|merma|perdi|se rompio|se cayo|boto|baja|elimina|descuenta)/.test(t)) setModo("merma");
    else if (/(ingresa|ingreso|entra|entro|llego|llegaron|suma|agrega|compre|recibi)/.test(t)) setModo("ingreso");
    else if (/(corrige|ajusta|queda en|quedan|hay|el real|quedaron|contamos|conte|deja en)/.test(t)) setModo("ajuste");
    // Cantidad (dígitos o palabra)
    const tokens = t.replace(/[.,]/g, " ").split(/\s+/);
    let cant = 0;
    for (const w of tokens) { if (/^\d+$/.test(w)) { cant = parseInt(w, 10); break; } if (NUM[w] != null) { cant = NUM[w]; break; } }
    if (cant > 0) setCantidad(String(cant));
    // Producto (mejor calce por nombre)
    const resto = tokens.filter((w) => !/^\d+$/.test(w) && NUM[w] == null).join(" ");
    let best: Item | null = null; let bestScore = 0;
    for (const p of productos) {
      const pn = norm(p.nombre);
      const palabras = pn.split(/\s+/).filter((w) => w.length > 2);
      const score = palabras.reduce((a, w) => a + (resto.includes(w) ? 1 : 0), 0);
      if (score > bestScore) { bestScore = score; best = p; }
    }
    if (best && bestScore > 0) setProductoId(best.id);
  };

  const escuchar = () => {
    const rec = recRef.current; if (!rec || escuchando) return;
    setDijo("");
    rec.onresult = (e) => interpretar(e.results[0][0].transcript);
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  };

  const m = MODOS.find((x) => x.k === modo)!;
  const necesitaOrigen = modo === "merma" || modo === "transferencia";
  const necesitaDestino = modo === "ingreso" || modo === "ajuste" || modo === "transferencia";
  const puede = productoId && Number(cantidad) >= (modo === "ajuste" ? 0 : 1)
    && (!necesitaOrigen || origen) && (!necesitaDestino || destino) && (modo !== "transferencia" || origen !== destino);

  const selCls = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500";

  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-bold text-slate-900">Ajustar stock de productos</h2>
      <p className="mb-3 text-sm text-slate-500">Todo queda registrado (auditable). Usa la voz o los botones.</p>

      {/* Voz */}
      {soportado && (
        <div className="mb-3">
          <button type="button" onClick={escuchar} disabled={escuchando}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white active:brightness-95 ${escuchando ? "animate-pulse bg-red-500" : "bg-[#0f766e]"}`}>
            🎙️ {escuchando ? "Escuchando… habla ahora" : "Dictar ajuste"}
          </button>
          {!dijo && <p className="mt-1 text-center text-[11px] text-slate-400">Ej: “quita 3 paletas de agua” · “corrige postre 500 a 20” · “ingresaron 50 trufas”</p>}
          {dijo && <p className="mt-1 text-center text-xs text-slate-400">Escuché: “{dijo}”</p>}
        </div>
      )}

      {/* Modos */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MODOS.map((x) => (
          <button key={x.k} type="button" onClick={() => setModo(x.k)}
            className={`rounded-xl border-2 p-2 text-left transition ${modo === x.k ? "text-white" : "border-slate-200 bg-white text-slate-700"}`}
            style={modo === x.k ? { backgroundColor: x.color, borderColor: x.color } : undefined}>
            <span className="block text-sm font-extrabold">{x.label}</span>
            <span className={`block text-[10px] ${modo === x.k ? "text-white/85" : "text-slate-400"}`}>{x.desc}</span>
          </button>
        ))}
      </div>

      <form action={registrarMovimiento} className="mt-4 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="tipo" value={modo} />
        <input type="hidden" name="ubicacionOrigenId" value={necesitaOrigen ? origen : ""} />
        <input type="hidden" name="ubicacionDestinoId" value={necesitaDestino ? destino : ""} />

        <label className="text-sm font-bold text-slate-700 sm:col-span-2">Producto
          <select name="productoId" required value={productoId} onChange={(e) => setProductoId(e.target.value)} className={selCls}>
            <option value="">Selecciona…</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>

        {necesitaOrigen && (
          <label className="text-sm font-bold text-slate-700">{modo === "transferencia" ? "Desde" : "Sacar de"}
            <select value={origen} onChange={(e) => setOrigen(e.target.value)} className={selCls}>
              <option value="">—</option>
              {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </label>
        )}
        {necesitaDestino && (
          <label className="text-sm font-bold text-slate-700">{modo === "transferencia" ? "Hacia" : "Ubicación"}
            <select value={destino} onChange={(e) => setDestino(e.target.value)} className={selCls}>
              <option value="">—</option>
              {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </label>
        )}

        <label className="text-sm font-bold text-slate-700">
          {modo === "ajuste" ? "Cantidad real" : "Cantidad"}
          <input type="number" name="cantidad" min={modo === "ajuste" ? "0" : "1"} step="1" inputMode="numeric"
            value={cantidad} onChange={(e) => setCantidad(e.target.value)} className={selCls} placeholder="0" />
          {stockActual != null && (
            <span className="mt-1 block text-[11px] text-slate-400">
              Stock actual: <b className="text-slate-600">{stockActual}</b>
              {modo === "merma" && cantidad ? ` → quedará ${Math.max(0, stockActual - Number(cantidad))}` : ""}
              {modo === "ajuste" && cantidad ? ` → quedará ${Number(cantidad)}` : ""}
              {modo === "ingreso" && cantidad ? ` → quedará ${stockActual + Number(cantidad)}` : ""}
            </span>
          )}
        </label>

        <div className="flex items-end sm:col-span-2">
          <button disabled={!puede}
            className="w-full rounded-lg px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
            style={{ backgroundColor: m.color }}>
            {m.verbo} {cantidad || ""}
          </button>
        </div>
      </form>
    </section>
  );
}
