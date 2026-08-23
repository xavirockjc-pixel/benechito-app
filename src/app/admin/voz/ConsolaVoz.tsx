"use client";

import { useEffect, useRef, useState } from "react";
import { interpretarComando, type Comando, type ItemCat } from "@/lib/dominio/comandos";
import { ejecutarComando } from "./actions";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

const tipoLabel: Record<string, string> = { apartar: "Apartar en bodega", mezclar: "Mandar a mezclar", fabricar: "Mandar a fabricar", entrega: "Entrega", otro: "Agenda" };

export default function ConsolaVoz({ catalogo }: { catalogo: ItemCat[] }) {
  const recRef = useRef<SpeechRec | null>(null);
  const [soportado, setSoportado] = useState(true);
  const [escuchando, setEscuchando] = useState(false);
  const [dijo, setDijo] = useState("");
  const [cmd, setCmd] = useState<Comando | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) { setSoportado(false); return; }
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    recRef.current = rec;
  }, []);

  const interpretar = (texto: string) => {
    setDijo(texto);
    setCmd(interpretarComando(texto, catalogo));
  };

  const escuchar = () => {
    const rec = recRef.current;
    if (!rec || escuchando) return;
    setCmd(null); setDijo("");
    rec.onresult = (e) => interpretar(e.results[0][0].transcript);
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  };

  const fechaLegible = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" });
  };

  return (
    <div className="space-y-4">
      {soportado ? (
        <button type="button" onClick={escuchar} disabled={escuchando}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-5 text-lg font-extrabold text-white shadow active:brightness-95 ${escuchando ? "animate-pulse bg-red-500" : "bg-slate-900"}`}>
          🎙️ {escuchando ? "Escuchando… habla ahora" : "Dictar un comando"}
        </button>
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Este navegador no tiene reconocimiento de voz. Usa Chrome en Android, o escribe el comando abajo.
        </p>
      )}

      {/* Escribir el comando a mano (respaldo) */}
      <input
        value={dijo}
        onChange={(e) => interpretar(e.target.value)}
        placeholder='Ej: "orden de producción cien frutilla" o "agenda entrega dos surtido el viernes"'
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-naranja"
      />

      {/* Vista previa de lo entendido */}
      {cmd && cmd.intent === "desconocido" && dijo.trim() && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-bold">No entendí el comando 🤔</p>
          <p className="mt-1">Prueba: <span className="font-mono">“orden de producción cien frutilla”</span> o <span className="font-mono">“agenda fabricar cincuenta paletas para el viernes”</span>.</p>
        </div>
      )}

      {cmd && cmd.intent === "orden" && (
        <PreviewCard color="teal">
          <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Crear orden de producción</p>
          <p className="mt-1 text-lg font-extrabold text-slate-900">{cmd.cantidad} × {cmd.nombre}</p>
          <ConfirmForm fields={{ intent: "orden", clase: cmd.clase, refId: cmd.refId, cantidad: String(cmd.cantidad) }} />
        </PreviewCard>
      )}

      {cmd && cmd.intent === "agenda" && (
        <PreviewCard color="blue">
          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{tipoLabel[cmd.tipo] ?? "Agendar"}</p>
          <p className="mt-1 text-lg font-extrabold text-slate-900">{cmd.titulo}</p>
          <p className="text-sm capitalize text-slate-500">📅 {fechaLegible(cmd.fecha)}</p>
          <ConfirmForm fields={{
            intent: "agenda", tipo: cmd.tipo, titulo: cmd.titulo, fecha: cmd.fecha,
            clase: cmd.clase ?? "", refId: cmd.refId ?? "", cantidad: cmd.cantidad ? String(cmd.cantidad) : "",
          }} />
        </PreviewCard>
      )}
    </div>
  );
}

function PreviewCard({ color, children }: { color: string; children: React.ReactNode }) {
  const border = color === "teal" ? "border-teal-300" : "border-blue-300";
  return <div className={`rounded-2xl border-2 ${border} bg-white p-4 shadow-sm`}>{children}</div>;
}

function ConfirmForm({ fields }: { fields: Record<string, string> }) {
  return (
    <form action={ejecutarComando} className="mt-3 flex gap-2">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button className="flex-1 rounded-xl bg-green-600 py-3 text-base font-extrabold text-white active:brightness-95">✓ Confirmar</button>
    </form>
  );
}
