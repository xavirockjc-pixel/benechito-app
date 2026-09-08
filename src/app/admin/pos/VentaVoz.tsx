"use client";

import { useEffect, useRef, useState } from "react";
import { venderVoz } from "./actions";
import { CANALES_VENTA, type CanalVenta, parseVentaVoz, normalizaVV } from "@/lib/dominio/venta-voz";

type Prod = { id: string; nombre: string; precios: { local: number; ruta: number; distribuidor: number } };
type Cli = { id: string; nombre: string; comuna: string };
type Linea = { cantidad: number; nombre: string; productoId: string; precioUnit: number };

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

// Match simple de producto por cobertura de palabras (≥3 letras).
function matchProd(nombre: string, productos: Prod[]): Prod | null {
  const norm = normalizaVV(nombre);
  let mejor: Prod | null = null, mejorScore = 0;
  for (const p of productos) {
    const toks = normalizaVV(p.nombre).split(/\s+/).filter((w) => w.length >= 3);
    if (!toks.length) continue;
    const aciertos = toks.filter((w) => norm.includes(w)).length;
    const score = aciertos / toks.length;
    if (aciertos > 0 && score > mejorScore) { mejorScore = score; mejor = p; }
  }
  return mejor;
}

export default function VentaVoz({ productos, clientes }: { productos: Prod[]; clientes: Cli[] }) {
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [canal, setCanal] = useState<CanalVenta>("local");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [modo, setModo] = useState<"efectivo" | "transferencia" | "fiado">("efectivo");
  const [negocioId, setNegocioId] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Precio de un producto según el canal elegido.
  const precioCanal = (p: Prod | null, c: CanalVenta) => (p ? p.precios[c] : 0);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const dicho = e.results[0][0].transcript;
      const { canal: c, lineas: ls } = parseVentaVoz(dicho);
      setCanal(c);
      const nuevas: Linea[] = ls.map((l) => {
        const p = matchProd(l.nombre, productos);
        return { cantidad: l.cantidad, nombre: p?.nombre ?? l.nombre, productoId: p?.id ?? "", precioUnit: precioCanal(p, c) };
      });
      setLineas((prev) => [...prev, ...nuevas]);
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    recRef.current = rec;
  }, [productos]);

  // Al cambiar de canal, recalcula precios de las líneas con producto conocido (si no fueron editados a mano).
  function cambiarCanal(c: CanalVenta) {
    setCanal(c);
    setLineas((ls) => ls.map((l) => {
      const p = productos.find((x) => x.id === l.productoId);
      return p ? { ...l, precioUnit: precioCanal(p, c) || l.precioUnit } : l;
    }));
  }

  function dictar() {
    if (!recRef.current || escuchando) return;
    try { recRef.current.start(); setEscuchando(true); } catch { /* activo */ }
  }

  const setLinea = (i: number, patch: Partial<Linea>) => setLineas((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const quitar = (i: number) => setLineas((ls) => ls.filter((_, j) => j !== i));
  const agregarVacia = () => setLineas((ls) => [...ls, { cantidad: 1, nombre: "", productoId: "", precioUnit: 0 }]);

  const total = lineas.reduce((s, l) => s + l.cantidad * l.precioUnit, 0);
  const faltaPrecio = lineas.some((l) => l.precioUnit <= 0);
  const faltaCliente = modo === "fiado" && !negocioId;
  const puedeVender = lineas.length > 0 && lineas.every((l) => (l.nombre.trim() || l.productoId) && l.cantidad > 0) && !faltaPrecio && !faltaCliente;

  return (
    <form
      action={venderVoz}
      onSubmit={() => setEnviando(true)}
      className="space-y-4"
    >
      <input type="hidden" name="canal" value={canal} />
      <input type="hidden" name="modo" value={modo} />
      <input type="hidden" name="negocioId" value={negocioId} />
      <input type="hidden" name="items" value={JSON.stringify(lineas.map((l) => ({ productoId: l.productoId || undefined, nombre: l.productoId ? undefined : l.nombre, cantidad: l.cantidad, precioUnit: l.precioUnit })))} />

      {/* Canal */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(CANALES_VENTA) as CanalVenta[]).map((k) => (
          <button type="button" key={k} onClick={() => cambiarCanal(k)}
            className={`rounded-xl border py-2.5 text-sm font-extrabold ${canal === k ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>
            {CANALES_VENTA[k].icon} {CANALES_VENTA[k].label}
          </button>
        ))}
      </div>

      {/* Botón dictar */}
      {soportado ? (
        <button type="button" onClick={dictar}
          className={`w-full rounded-2xl py-5 text-lg font-extrabold text-white shadow-sm ${escuchando ? "animate-pulse bg-red-500" : "bg-[#0f7a44]"}`}>
          {escuchando ? "🔴 Escuchando…" : "🎤 Tocar y dictar la venta"}
        </button>
      ) : (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-700">Tu navegador no soporta voz. Agrega las líneas a mano abajo.</p>
      )}
      <p className="-mt-2 text-center text-[11px] text-slate-400">Ej: <i>“3 chocolates y 2 trufas a distribuidor”</i></p>

      {/* Líneas */}
      {lineas.length > 0 && (
        <div className="space-y-2">
          {lineas.map((l, i) => {
            const nuevo = !l.productoId && l.nombre.trim();
            return (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <input type="number" min={1} value={l.cantidad} onChange={(e) => setLinea(i, { cantidad: Math.max(1, Number(e.target.value) || 1) })}
                    className="w-14 rounded-lg border border-slate-300 px-2 py-2 text-center text-sm font-bold" />
                  <input value={l.nombre} onChange={(e) => setLinea(i, { nombre: e.target.value, productoId: "" })} placeholder="producto"
                    className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
                  <button type="button" onClick={() => quitar(i)} className="shrink-0 text-slate-400 hover:text-red-500">✕</button>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1 text-xs text-slate-500">$ c/u
                    <input type="number" min={0} value={l.precioUnit} onChange={(e) => setLinea(i, { precioUnit: Math.max(0, Number(e.target.value) || 0) })}
                      className={`w-24 rounded-lg border px-2 py-1.5 text-sm ${l.precioUnit <= 0 ? "border-red-300 bg-red-50" : "border-slate-300"}`} />
                  </label>
                  <span className="text-sm font-extrabold text-slate-800 tabular-nums">{CLP(l.cantidad * l.precioUnit)}</span>
                </div>
                {nuevo && <p className="mt-1 text-[11px] font-semibold text-sky-600">✨ Producto nuevo — se agrega al catálogo al vender</p>}
              </div>
            );
          })}
        </div>
      )}

      <button type="button" onClick={agregarVacia} className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50">+ Agregar línea a mano</button>

      {/* Medio de pago */}
      <div className="grid grid-cols-3 gap-2">
        {([["efectivo", "💵 Efectivo"], ["transferencia", "🏦 Transfer."], ["fiado", "🕗 Fiado"]] as const).map(([k, lbl]) => (
          <button type="button" key={k} onClick={() => setModo(k)}
            className={`rounded-xl border py-2 text-sm font-bold ${modo === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500"}`}>
            {lbl}
          </button>
        ))}
      </div>

      {/* Cliente (para fiado / distribuidor / ruta) */}
      {(modo === "fiado" || canal !== "local") && (
        <label className="block text-sm font-bold text-slate-700">Cliente {modo === "fiado" && <span className="text-red-500">(obligatorio para fiado)</span>}
          <select value={negocioId} onChange={(e) => setNegocioId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
            <option value="">— Consumidor final —</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.comuna ? ` · ${c.comuna}` : ""}</option>)}
          </select>
        </label>
      )}

      {/* Total + enviar */}
      <div className="flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-white">
        <span className="text-sm font-bold text-white/70">Total</span>
        <span className="text-2xl font-extrabold tabular-nums">{CLP(total)}</span>
      </div>
      {faltaPrecio && lineas.length > 0 && <p className="text-center text-xs font-semibold text-red-500">Completa el precio de cada producto.</p>}
      <button disabled={!puedeVender || enviando}
        className="w-full rounded-2xl bg-emerald-600 py-4 text-lg font-extrabold text-white shadow-sm active:brightness-110 disabled:opacity-40">
        {enviando ? "Registrando…" : `✅ Registrar venta ${total > 0 ? CLP(total) : ""}`}
      </button>
    </form>
  );
}
