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

const TURNOS = [
  { id: "1", label: "1er turno" },
  { id: "2", label: "2do turno" },
  { id: "3", label: "3er turno" },
];

/**
 * Reporte simple del turno: turno, tipo (o uno nuevo), sabores + cuántos, litros,
 * quiénes trabajaron y observaciones (faltó algo / cambiaron la receta).
 * Todo lo interno (rendimiento, costos) se calcula en el panel, no aquí.
 */
export default function ProduccionForm({ saboresPorLinea = {}, equipo = [], yoId, recomendaciones = {} }: {
  saboresPorLinea?: Record<string, string[]>;
  equipo?: { usuarioId: string; nombre: string }[];
  yoId?: string;
  recomendaciones?: Record<string, string[]>; // por línea + clave "__todas__" para las globales
}) {
  const [turno, setTurno] = useState("1");
  const [linea, setLinea] = useState<string>(LINEAS_PRODUCCION[0]);
  const [nuevoTipo, setNuevoTipo] = useState("");
  const esNuevo = linea === "__nuevo__";
  const lineaFinal = esNuevo ? nuevoTipo.trim() : linea;
  // Quiénes trabajaron este turno (para dividir el pago por trato). Por defecto: yo.
  const [sel, setSel] = useState<string[]>(yoId && equipo.some((e) => e.usuarioId === yoId) ? [yoId] : []);
  const toggleSel = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const saboresTipo = esNuevo ? [] : (saboresPorLinea[linea] ?? []);
  const [filas, setFilas] = useState<Fila[]>([{ key: 1, nombre: "", cantidad: "" }]);
  const [litros, setLitros] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);

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
  const listo = total > 0 && lineaFinal.length > 0;
  // Recomendaciones de la central: las globales + las del producto elegido (solo sugerencia).
  const notasRec = esNuevo ? [] : [...(recomendaciones["__todas__"] ?? []), ...(recomendaciones[linea] ?? [])];

  return (
    <form action={registrarProduccion} className="space-y-4">
      <input type="hidden" name="turno" value={turno} />
      <input type="hidden" name="linea" value={lineaFinal} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="participantes" value={sel.join(",")} />
      <input type="hidden" name="litros" value={litros} />
      <input type="hidden" name="observaciones" value={observaciones} />

      {/* Turno */}
      <div>
        <p className="mb-1.5 text-sm font-bold text-slate-700">Turno</p>
        <div className="flex gap-2">
          {TURNOS.map((t) => (
            <button key={t.id} type="button" onClick={() => setTurno(t.id)}
              className={`flex-1 rounded-xl border-2 py-2.5 text-sm font-bold ${turno === t.id ? "border-[#0f766e] bg-teal-50 text-[#0f766e]" : "border-slate-200 bg-white text-slate-500"}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tipo (o nuevo) */}
      <label className="block text-sm font-bold text-slate-700">Tipo de producto
        <select value={linea} onChange={(e) => setLinea(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#0f766e]">
          {LINEAS_PRODUCCION.map((l) => <option key={l} value={l}>{lineaLabel[l] ?? l}</option>)}
          <option value="__nuevo__">➕ Nuevo producto…</option>
        </select>
      </label>
      {esNuevo && (
        <input value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)} placeholder="Nombre del producto nuevo (ej: Sándwich de helado)"
          className="w-full rounded-lg border-2 border-[#0f766e] px-3 py-2.5 text-sm" />
      )}

      {/* Recomendación de la central (sugerencia, no obligación) — colapsable */}
      {notasRec.length > 0 && (
        <details className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <summary className="cursor-pointer text-xs font-extrabold text-amber-700">💡 {notasRec.length} recomendación{notasRec.length === 1 ? "" : "es"} (no obligatorio) ▾</summary>
          <ul className="mt-1 space-y-0.5">
            {notasRec.map((n, i) => (
              <li key={i} className="text-sm font-semibold text-amber-900">• {n}</li>
            ))}
          </ul>
        </details>
      )}

      {/* Sabores + cuántos */}
      <div>
        <p className="mb-1.5 text-sm font-bold text-slate-700">Sabores y cantidad (unidades)</p>
        {soportado && (
          <button type="button" onClick={escuchar} disabled={escuchando}
            className={`mb-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white ${escuchando ? "animate-pulse bg-red-500" : "bg-[#0f766e]"}`}>
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
              <button type="button" onClick={() => delFila(f.key)} aria-label="Quitar fila" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base font-bold text-red-500 active:bg-red-50">✕</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={addFila} className="mt-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 active:bg-slate-200">
          + Otro sabor
        </button>
      </div>

      {/* Litros (mezcla) */}
      <label className="block text-sm font-bold text-slate-700">Litros de mezcla (opcional)
        <input value={litros} onChange={(e) => setLitros(e.target.value)} inputMode="decimal" placeholder="Ej: 53"
          className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2.5 text-base" />
      </label>

      {/* Quiénes trabajaron el turno (pago por trato se divide entre los marcados) */}
      {equipo.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="mb-2 text-xs font-bold text-slate-600">👥 ¿Quiénes trabajaron este turno?</p>
          <div className="flex flex-wrap gap-2">
            {equipo.map((e) => {
              const on = sel.includes(e.usuarioId);
              return (
                <button key={e.usuarioId} type="button" onClick={() => toggleSel(e.usuarioId)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${on ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-slate-300 bg-white text-slate-600"}`}>
                  {on ? "✓ " : ""}{e.nombre}{e.usuarioId === yoId ? " (tú)" : ""}
                </button>
              );
            })}
          </div>
          {sel.length > 1 && <p className="mt-2 text-[11px] font-semibold text-amber-600">Se reparte entre {sel.length} personas.</p>}
        </div>
      )}

      {/* Observaciones / ajustes de receta */}
      <label className="block text-sm font-bold text-slate-700">¿Faltó algo o cambiaron la receta? (opcional)
        <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2}
          placeholder="Ej: faltó edulcorante, le agregaron más azúcar…"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm" />
      </label>

      <button disabled={!listo}
        className="w-full rounded-2xl bg-[#0f766e] py-4 text-base font-extrabold text-white shadow active:brightness-95 disabled:opacity-40">
        ✅ Enviar reporte del turno {total > 0 ? `(${total} u.)` : ""}
      </button>
      <p className="text-center text-[11px] text-slate-400">Queda registrado con tu nombre, la hora y quiénes trabajaron.</p>
    </form>
  );
}
