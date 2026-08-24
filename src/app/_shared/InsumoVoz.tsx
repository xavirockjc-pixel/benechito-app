"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { unidadLabel } from "@/lib/dominio/materias";
import { ingresarMateriaOperario, crearMateriaOperario } from "./materias-operario";

type Mat = { id: string; nombre: string; unidad: string; categoria: string };

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

const NUM: Record<string, number> = {
  cero: 0, un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8,
  nueve: 9, diez: 10, once: 11, doce: 12, docena: 12, trece: 13, catorce: 14, quince: 15, veinte: 20,
  treinta: 30, cuarenta: 40, cincuenta: 50, cien: 100, ciento: 100,
};
// Palabras de unidad → unidad del sistema
const UNIDAD: Record<string, string> = {
  kilo: "kg", kilos: "kg", kilogramo: "kg", kilogramos: "kg", kg: "kg",
  gramo: "g", gramos: "g", g: "g",
  litro: "l", litros: "l", l: "l",
  mililitro: "ml", mililitros: "ml", ml: "ml",
  unidad: "unidad", unidades: "unidad", u: "unidad", caja: "unidad", cajas: "unidad",
};
const RELLENO = new Set([
  "ingresa", "ingresar", "agrega", "agregar", "suma", "sumar", "pon", "poner", "mete", "meter",
  "crea", "crear", "nuevo", "nueva", "de", "del", "la", "el", "los", "las", "y", "por", "a",
  "insumo", "material", "llegaron", "llego", "recibimos", "recibi",
]);

function normaliza(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Extrae { cantidad, unidad, nombre } de la frase dictada. */
function parsear(texto: string): { cantidad: number; unidad: string | null; nombre: string } {
  const tokens = normaliza(texto).replace(/[.,;]/g, " ").split(/\s+/).filter(Boolean);
  let cantidad = 0;
  let unidad: string | null = null;
  const resto: string[] = [];
  for (const t of tokens) {
    if (/^\d+$/.test(t)) { cantidad = parseInt(t, 10); continue; }
    if (NUM[t] != null && cantidad === 0) { cantidad = NUM[t]; continue; }
    if (UNIDAD[t]) { unidad = UNIDAD[t]; continue; }
    if (RELLENO.has(t)) continue;
    resto.push(t);
  }
  return { cantidad, unidad, nombre: resto.join(" ").trim() };
}

/**
 * Voz para insumos del bodeguero: dicta "ingresa 5 kilos de chocolate".
 * Si el insumo existe → propone ingresar. Si es nuevo → propone crearlo e ingresar.
 */
export default function InsumoVoz({ materiales, color = "#b45309" }: { materiales: Mat[]; color?: string }) {
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [dijo, setDijo] = useState("");
  const [p, setP] = useState<{ cantidad: number; unidad: string | null; nombre: string } | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    recRef.current = rec;
  }, []);

  const interpretar = (texto: string) => { setDijo(texto); setP(parsear(texto)); };

  const escuchar = () => {
    const rec = recRef.current;
    if (!rec || escuchando) return;
    setP(null); setDijo("");
    rec.onresult = (e) => interpretar(e.results[0][0].transcript);
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  };

  // Busca el insumo existente que mejor calce con el nombre dictado.
  const match = useMemo(() => {
    if (!p?.nombre) return null;
    const n = normaliza(p.nombre);
    let best: Mat | null = null;
    for (const m of materiales) {
      const mn = normaliza(m.nombre);
      if (mn === n || mn.includes(n) || n.includes(mn)) {
        if (!best || Math.abs(mn.length - n.length) < Math.abs(normaliza(best.nombre).length - n.length)) best = m;
      }
    }
    return best;
  }, [p, materiales]);

  if (!soportado) return null;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={escuchar}
        disabled={escuchando}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold text-white shadow active:brightness-95 ${escuchando ? "animate-pulse bg-red-500" : ""}`}
        style={escuchando ? undefined : { backgroundColor: color }}
      >
        🎙️ {escuchando ? "Escuchando… habla ahora" : "Dictar insumo por voz"}
      </button>

      {dijo && <p className="text-center text-xs text-slate-400">Escuché: “{dijo}”</p>}

      {p && p.nombre && (
        match ? (
          // Insumo existente → ingresar
          <form action={ingresarMateriaOperario} className="rounded-2xl border-2 bg-white p-4 shadow-sm" style={{ borderColor: color }}>
            <input type="hidden" name="materiaPrimaId" value={match.id} />
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Ingresar a existencia</p>
            <p className="mt-1 text-lg font-extrabold text-slate-900">
              +{" "}
              <input
                name="cantidad" defaultValue={p.cantidad || ""} inputMode="decimal"
                className="w-20 rounded border border-slate-300 px-2 py-1 text-lg"
              />{" "}
              {unidadLabel[match.unidad] ?? match.unidad} · {match.nombre}
            </p>
            <button className="mt-3 w-full rounded-xl py-3 text-base font-extrabold text-white active:brightness-110" style={{ backgroundColor: color }}>
              ➕ Confirmar ingreso
            </button>
          </form>
        ) : (
          // Insumo nuevo → crear + ingresar
          <form action={crearMateriaOperario} className="rounded-2xl border-2 border-dashed bg-white p-4 shadow-sm" style={{ borderColor: color }}>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">🆕 Insumo nuevo — crear</p>
            <input
              name="nombre" defaultValue={p.nombre}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base font-bold text-slate-900"
            />
            <div className="mt-2 grid grid-cols-3 gap-2">
              <label className="text-xs font-semibold text-slate-500">Tipo
                <select name="categoria" defaultValue="insumo" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                  <option value="insumo">Materia prima</option>
                  <option value="material">Material</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-500">Unidad
                <select name="unidad" defaultValue={p.unidad ?? "unidad"} className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                  <option value="kg">kg</option><option value="g">g</option><option value="l">L</option>
                  <option value="ml">ml</option><option value="unidad">u.</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-500">Cantidad
                <input name="stockInicial" defaultValue={p.cantidad || ""} inputMode="decimal" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
              </label>
            </div>
            <button className="mt-3 w-full rounded-xl py-3 text-base font-extrabold text-white active:brightness-110" style={{ backgroundColor: color }}>
              🆕 Crear e ingresar
            </button>
          </form>
        )
      )}
    </div>
  );
}
