"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { venderPOS } from "./actions";

type Prod = { id: string; nombre: string; formato: string | null; precio: number };
type Cliente = { id: string; nombreNegocio: string; comuna: string };
type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export default function Caja({ productos, clientes = [] }: { productos: Prod[]; clientes?: Cliente[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [q, setQ] = useState("");
  const [modo, setModo] = useState("efectivo");
  const [abono, setAbono] = useState("");
  const [escuchando, setEscuchando] = useState(false);
  const [vozOk, setVozOk] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    recRef.current = rec; setVozOk(true);
  }, []);

  const dictarCliente = () => {
    const rec = recRef.current;
    if (!rec || escuchando) return;
    rec.onresult = (e) => {
      const txt = e.results[0][0].transcript.trim();
      // Si calza claro con un cliente, lo selecciona directo; si no, deja el texto para elegir.
      const match = clientes.find((c) => norm(c.nombreNegocio) === norm(txt))
        ?? clientes.find((c) => norm(c.nombreNegocio).includes(norm(txt)));
      if (match) { setCliente(match); setQ(""); } else setQ(txt);
    };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  };

  const clientesFiltrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return clientes.filter((c) => c.nombreNegocio.toLowerCase().includes(t) || (c.comuna ?? "").toLowerCase().includes(t)).slice(0, 6);
  }, [q, clientes]);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  const del = (id: string) =>
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const lineas = Object.entries(cart).map(([id, cantidad]) => {
    const p = porId.get(id)!;
    return { productoId: id, nombre: p.nombre, cantidad, precioUnit: p.precio };
  });
  const total = lineas.reduce((s, l) => s + l.precioUnit * l.cantidad, 0);
  const abonoNum = Math.min(Math.max(Number(abono.replace(/[^0-9]/g, "")) || 0, 0), total);
  const restante = total - abonoNum;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* Productos */}
      <div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {productos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => add(p.id)}
              className="rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-naranja hover:shadow"
            >
              <span className="block truncate font-semibold text-slate-900">{p.nombre}</span>
              <span className="block text-xs text-slate-400">{p.formato ?? ""}</span>
              <span className="mt-1 block font-bold text-naranja">{fmtCLP(p.precio)}</span>
            </button>
          ))}
        </div>
        {productos.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            No hay productos con precio en la lista “Sala de Ventas”. Cárgalos en Precios.
          </p>
        )}
      </div>

      {/* Carrito */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-4 lg:self-start">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Venta</h2>

        {/* Cliente (para poder dejar deuda / abono) */}
        <div className="mb-3">
          {cliente ? (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 p-2.5">
              <span className="min-w-0 truncate text-sm font-bold text-slate-800">🏪 {cliente.nombreNegocio}</span>
              <span className="flex shrink-0 items-center gap-2">
                <a href={`/admin/negocios/${cliente.id}`} target="_blank" rel="noopener" className="text-xs font-semibold text-naranja">historial ↗</a>
                <button type="button" onClick={() => { setCliente(null); if (modo === "abono" || modo === "credito") setModo("efectivo"); }} className="text-xs font-semibold text-slate-500">quitar</button>
              </span>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Cliente (opcional, para dejar deuda)…"
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500"
                />
                {vozOk && (
                  <button type="button" onClick={dictarCliente} title="Dictar cliente"
                    className={`shrink-0 rounded-lg px-3 text-white ${escuchando ? "animate-pulse bg-red-500" : "bg-[#0f766e]"}`}>
                    🎙️
                  </button>
                )}
              </div>
              {clientesFiltrados.length > 0 && (
                <div className="mt-1 space-y-1">
                  {clientesFiltrados.map((c) => (
                    <button key={c.id} type="button" onClick={() => { setCliente(c); setQ(""); }} className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-left text-sm hover:bg-slate-50">
                      <span className="truncate font-semibold text-slate-800">{c.nombreNegocio}</span>
                      <span className="ml-2 shrink-0 text-xs text-slate-400">{c.comuna}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[11px] text-slate-400">Sin cliente = mostrador (pago al contado).</p>
            </>
          )}
        </div>

        {lineas.length === 0 ? (
          <p className="text-sm text-slate-500">Toca un producto para agregarlo.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lineas.map((l) => (
              <li key={l.productoId} className="flex items-center justify-between gap-2 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-slate-800">{l.nombre}</span>
                  <span className="text-xs text-slate-400">{fmtCLP(l.precioUnit)} c/u</span>
                </span>
                <span className="flex items-center gap-2">
                  <button type="button" onClick={() => sub(l.productoId)} className="h-6 w-6 rounded bg-slate-100 font-bold text-slate-700">−</button>
                  <span className="w-6 text-center font-semibold">{l.cantidad}</span>
                  <button type="button" onClick={() => add(l.productoId)} className="h-6 w-6 rounded bg-slate-100 font-bold text-slate-700">+</button>
                  <button type="button" onClick={() => del(l.productoId)} className="ml-1 text-xs text-rojo/60">✕</button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
          <span className="font-bold text-slate-700">Total</span>
          <span className="text-xl font-extrabold text-slate-900">{fmtCLP(total)}</span>
        </div>

        <form action={venderPOS} className="mt-4 space-y-2">
          <input type="hidden" name="items" value={JSON.stringify(lineas)} />
          <input type="hidden" name="negocioId" value={cliente?.id ?? ""} />
          <select
            name="modo"
            value={modo}
            onChange={(e) => setModo(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500"
          >
            <option value="efectivo">Pago: Efectivo</option>
            <option value="transferencia">Pago: Transferencia</option>
            <option value="abono" disabled={!cliente}>Abono: paga una parte, queda debiendo{!cliente ? " (elige cliente)" : ""}</option>
            <option value="credito" disabled={!cliente}>Crédito (fiado){!cliente ? " (elige cliente)" : ""}</option>
          </select>

          {modo === "abono" && cliente && (
            <div className="rounded-lg bg-amber-50 p-2.5">
              <label className="block text-xs font-bold text-slate-600">Monto que paga ahora
                <input name="abono" inputMode="numeric" value={abono} onChange={(e) => setAbono(e.target.value)} placeholder="Ej: 20000" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-amber-500" />
              </label>
              <select name="medioAbono" defaultValue="efectivo" className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800">
                <option value="efectivo">Con efectivo</option>
                <option value="transferencia">Con transferencia</option>
              </select>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">Queda debiendo</span>
                <span className="font-extrabold text-red-600">{fmtCLP(restante)}</span>
              </div>
            </div>
          )}

          <button
            disabled={lineas.length === 0}
            className="w-full rounded-lg bg-green-600 px-4 py-3 font-bold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {modo === "abono" && cliente
              ? `Cobrar ${fmtCLP(abonoNum)} · deuda ${fmtCLP(restante)}`
              : modo === "credito" && cliente
                ? `Dejar a crédito ${total > 0 ? fmtCLP(total) : ""}`
                : `Cobrar ${total > 0 ? fmtCLP(total) : ""}`}
          </button>
        </form>
      </div>
    </div>
  );
}
