"use client";

import { useEffect, useRef, useState } from "react";
import { registrarAsistencia } from "./actions";
import { TIPOS_ASISTENCIA, tipoAsistenciaLabel, tipoAsistenciaIcono } from "@/lib/dominio/equipo";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

type Parsed = { tipo: string; horaEntrada: string; horaSalida: string; horasExtra: string; notas: string };

const PALABRA_NUM: Record<string, number> = {
  cero: 0, un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20, veintiuno: 21,
  veintidos: 22, veintitres: 23, treinta: 30, cuarenta: 40, cincuenta: 50,
};

function normaliza(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Convierte palabras-número a dígitos ("ocho treinta" → "8 30"). */
function digitaliza(txt: string): string {
  return txt.split(/\s+/).map((w) => (PALABRA_NUM[w] != null ? String(PALABRA_NUM[w]) : w)).join(" ");
}

/** Interpreta un fragmento como hora "HH:MM". Soporta 8:30, "8 30", "8 y media", "6 de la tarde". */
function aHora(frag: string): string {
  let t = frag.trim();
  const tarde = /(tarde|noche)/.test(t);
  const manana = /(manana|madrugada)/.test(t);
  let h = 0, min = 0;
  let m = /(\d{1,2})\s*[:.]\s*(\d{2})/.exec(t);
  if (m) { h = +m[1]; min = +m[2]; }
  else if ((m = /(\d{1,2})\s+y\s+media/.exec(t))) { h = +m[1]; min = 30; }
  else if ((m = /(\d{1,2})\s+y\s+cuarto/.exec(t))) { h = +m[1]; min = 15; }
  else if ((m = /(\d{1,2})\s+(\d{1,2})/.exec(t))) { h = +m[1]; min = +m[2]; }
  else if ((m = /(\d{1,2})/.exec(t))) { h = +m[1]; min = 0; }
  else return "";
  if (tarde && h < 12) h += 12;
  if (manana && h === 12) h = 0;
  if (h > 23 || min > 59) return "";
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

/** Extrae { tipo, entrada, salida, horasExtra, notas } de la frase dictada. */
function parsear(texto: string): Parsed {
  const raw = normaliza(texto);
  let t = digitaliza(raw);

  // Tipo de jornada por palabras clave.
  let tipo = "trabajo";
  if (/\b(falta|falto|no vino|ausente|no asistio)\b/.test(t)) tipo = "falta";
  else if (/\blicencia\b/.test(t)) tipo = "licencia";
  else if (/\bpermiso\b/.test(t)) tipo = "permiso";
  else if (/(salio antes|se fue antes|salida antes|antes de tiempo)/.test(t)) tipo = "salida_antes";

  // Horas extra: "2 horas extra".
  let horasExtra = "";
  const he = /(\d{1,2}(?:[.,]\d)?)\s*horas?\s*extras?/.exec(t);
  if (he) { horasExtra = he[1].replace(",", "."); t = t.replace(he[0], " "); }

  // Rango "de 8 a 6" / "de 8:30 a 18:00".
  let horaEntrada = "", horaSalida = "";
  const rango = /\bde\s+(\d{1,2}(?:[:. ]\d{2})?(?:\s*y\s*(?:media|cuarto))?)\s+a(?:\s+las?)?\s+(\d{1,2}(?:[:. ]\d{2})?(?:\s*y\s*(?:media|cuarto))?)/.exec(t);
  if (rango) {
    horaEntrada = aHora(rango[1]);
    horaSalida = aHora(rango[2] + (/(tarde|noche)/.test(t) ? " tarde" : ""));
    t = t.replace(rango[0], " ");
  }
  // Entrada explícita.
  if (!horaEntrada) {
    const e = /(?:entro|entra|entrada|llego|llega|ingreso|empezo|inicio|marco)\s+(?:a\s+las?\s+)?(\d{1,2}(?:[:. ]\d{2})?(?:\s*y\s*(?:media|cuarto))?)/.exec(t);
    if (e) { horaEntrada = aHora(e[1]); t = t.replace(e[0], " "); }
  }
  // Salida explícita.
  if (!horaSalida) {
    const s = /(?:salio|sale|salida|se fue|termino|hasta)\s+(?:a\s+las?\s+)?(\d{1,2}(?:[:. ]\d{2})?(?:\s*y\s*(?:media|cuarto))?(?:\s*(?:de la )?(?:tarde|noche|manana))?)/.exec(t);
    if (s) { horaSalida = aHora(s[1]); t = t.replace(s[0], " "); }
  }

  // Nota: lo que hizo. Toma lo que sigue a "nota/hizo/hice/anota" si está; si no, el texto limpio.
  let notas = "";
  const nm = /(?:nota|anota|hizo|hice|estuvo|trabajo en|se dedico a|realizo)\s+(.*)$/.exec(t);
  if (nm) notas = nm[1];
  else {
    notas = t
      .replace(/\b(entro|entra|entrada|llego|llega|ingreso|empezo|inicio|marco|salio|sale|salida|se fue|termino|hasta|de|a|las?|los|y|el|la|permiso|licencia|falta|falto)\b/g, " ")
      .replace(/\d+/g, " ");
  }
  notas = notas.replace(/\s+/g, " ").trim();
  // Capitaliza primera letra.
  if (notas) notas = notas.charAt(0).toUpperCase() + notas.slice(1);

  return { tipo, horaEntrada, horaSalida, horasExtra, notas };
}

const hoyISO = () => new Date().toLocaleDateString("en-CA"); // yyyy-mm-dd local

export default function AsistenciaVoz({ trabajadorId, color = "#0f766e" }: { trabajadorId: string; color?: string }) {
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
        type="button"
        onClick={escuchar}
        disabled={escuchando}
        className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-extrabold text-white shadow active:brightness-95 ${escuchando ? "animate-pulse bg-red-500" : ""}`}
        style={escuchando ? undefined : { backgroundColor: color }}
      >
        🎙️ {escuchando ? "Escuchando… habla ahora" : "Marcar asistencia por voz"}
      </button>

      {!dijo && (
        <p className="text-center text-[11px] text-slate-400">
          Ej: “entró 8:30, salió 6 de la tarde, 2 horas extra, ordenó la bodega” · “permiso médico” · “salió antes, dolor de cabeza”
        </p>
      )}
      {dijo && <p className="text-center text-xs text-slate-400">Escuché: “{dijo}”</p>}

      {p && (
        <form action={registrarAsistencia} className="rounded-2xl border-2 bg-white p-4 shadow-sm" style={{ borderColor: color }}>
          <input type="hidden" name="trabajadorId" value={trabajadorId} />
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Revisa y confirma</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-slate-600">Fecha
              <input type="date" name="fecha" defaultValue={hoyISO()} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">Tipo
              <select name="tipo" defaultValue={p.tipo} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
                {TIPOS_ASISTENCIA.map((x) => <option key={x} value={x}>{tipoAsistenciaIcono[x]} {tipoAsistenciaLabel[x]}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Entrada
              <input type="time" name="horaEntrada" defaultValue={p.horaEntrada} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">Salida
              <input type="time" name="horaSalida" defaultValue={p.horaSalida} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">Horas extra
              <input name="horasExtra" inputMode="decimal" defaultValue={p.horasExtra} placeholder="0" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">¿Qué hizo?
              <input name="notas" defaultValue={p.notas} placeholder="nota del día" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
          </div>
          <button className="mt-3 w-full rounded-xl py-3 text-base font-extrabold text-white active:brightness-110" style={{ backgroundColor: color }}>
            ✅ Confirmar asistencia
          </button>
        </form>
      )}
    </div>
  );
}
