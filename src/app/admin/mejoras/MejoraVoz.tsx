"use client";

import { useEffect, useRef, useState } from "react";
import { crearMejora } from "./actions";
import { AREAS_MEJORA, areaMejoraLabel, areaMejoraIcono, PRIORIDADES, prioridadLabel } from "@/lib/dominio/mejoras";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};
type Parsed = { titulo: string; area: string; prioridad: string; fecha: string };

function normaliza(s: string) { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

/** Detecta área por palabras clave. */
function detectaArea(t: string): string {
  if (/(produccion|fabrica|maquina|selladora|linea|horno|lote|receta)/.test(t)) return "produccion";
  if (/(venta|vender|pos|caja|cliente compra)/.test(t)) return "ventas";
  if (/(reparto|despacho|ruta|entrega|vehiculo|camion)/.test(t)) return "reparto";
  if (/(inventario|stock|bodega|insumo|materia)/.test(t)) return "inventario";
  if (/(equipo|trabajador|personal|contratar|turno)/.test(t)) return "equipo";
  if (/(calidad|bpm|higiene|inocuidad|epp)/.test(t)) return "calidad";
  if (/(marketing|redes|instagram|facebook|publicidad|post)/.test(t)) return "marketing";
  return "general";
}
/** Fecha relativa simple → yyyy-mm-dd. */
function detectaFecha(t: string): string {
  const hoy = new Date();
  const iso = (d: Date) => d.toLocaleDateString("en-CA");
  if (/\bhoy\b/.test(t)) return iso(hoy);
  if (/\bmanana\b/.test(t)) { const d = new Date(hoy); d.setDate(d.getDate() + 1); return iso(d); }
  if (/(proxima semana|otra semana)/.test(t)) { const d = new Date(hoy); d.setDate(d.getDate() + 7); return iso(d); }
  if (/(fin de mes|proximo mes)/.test(t)) { const d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0); return iso(d); }
  const dias = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  for (let i = 0; i < 7; i++) if (t.includes(dias[i])) { const d = new Date(hoy); const diff = (i - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + diff); return iso(d); }
  return "";
}
function parsear(texto: string): Parsed {
  const t = normaliza(texto);
  let prioridad = "media";
  if (/(urgente|alta prioridad|importante|cuanto antes|prioridad alta)/.test(t)) prioridad = "alta";
  else if (/(baja prioridad|cuando se pueda|sin apuro|prioridad baja)/.test(t)) prioridad = "baja";
  // Título: el texto tal cual, con mayúscula inicial.
  let titulo = texto.trim().replace(/\s+/g, " ");
  if (titulo) titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);
  return { titulo, area: detectaArea(t), prioridad, fecha: detectaFecha(t) };
}

export default function MejoraVoz() {
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [dijo, setDijo] = useState("");
  const [p, setP] = useState<Parsed | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    recRef.current = rec;
  }, []);

  const escuchar = () => {
    const rec = recRef.current;
    if (!rec || escuchando) return;
    setP(null); setDijo("");
    rec.onresult = (e) => { const txt = e.results[0][0].transcript; setDijo(txt); setP(parsear(txt)); };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  };

  if (!soportado) return null;

  return (
    <div className="space-y-3">
      <button
        type="button" onClick={escuchar} disabled={escuchando}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold text-white shadow active:brightness-95 ${escuchando ? "animate-pulse bg-red-500" : "bg-[#0f766e]"}`}
      >
        🎙️ {escuchando ? "Escuchando… habla ahora" : "Dictar una mejora o proyecto"}
      </button>
      {!dijo && <p className="text-center text-[11px] text-slate-400">Ej: “implementar nueva máquina selladora para la línea de postres, urgente, próxima semana”</p>}
      {dijo && <p className="text-center text-xs text-slate-400">Escuché: “{dijo}”</p>}

      {p && (
        <form action={crearMejora} className="rounded-2xl border-2 border-[#0f766e] bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Revisa y confirma</p>
          <label className="mt-2 block text-xs font-bold text-slate-600">Mejora / proyecto
            <input name="titulo" defaultValue={p.titulo} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900" />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="text-xs font-bold text-slate-600">Área
              <select name="area" defaultValue={p.area} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {AREAS_MEJORA.map((a) => <option key={a} value={a}>{areaMejoraIcono[a]} {areaMejoraLabel[a]}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Prioridad
              <select name="prioridad" defaultValue={p.prioridad} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {PRIORIDADES.map((x) => <option key={x} value={x}>{prioridadLabel[x]}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Fecha objetivo
              <input type="date" name="fechaObjetivo" defaultValue={p.fecha} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
            <label className="flex items-end gap-2 pb-2 text-xs font-bold text-slate-600">
              <input type="checkbox" name="recordar" defaultChecked={!!p.fecha} className="h-4 w-4 accent-[#0f766e]" /> Recordar
            </label>
          </div>
          <button className="mt-3 w-full rounded-xl bg-[#0f766e] py-3 text-base font-extrabold text-white active:brightness-110">✅ Guardar mejora</button>
        </form>
      )}
    </div>
  );
}
