"use client";

import { useEffect, useRef, useState } from "react";
import { crearProductoBodega } from "./actions";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

const inp = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#b45309]";

export default function NuevoProductoBodega() {
  const [nombre, setNombre] = useState("");
  const [linea, setLinea] = useState("");
  const [formato, setFormato] = useState("");
  const [tipo, setTipo] = useState("reventa");
  const [cantidad, setCantidad] = useState("");
  const [stockMin, setStockMin] = useState("");
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [vozOk, setVozOk] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "es-CL"; rec.interimResults = false; rec.continuous = false; rec.maxAlternatives = 1;
    recRef.current = rec; setVozOk(true);
  }, []);

  const dictar = () => {
    const rec = recRef.current; if (!rec || escuchando) return;
    rec.onresult = (e) => { const t = e.results[0][0].transcript.trim(); setNombre(t.charAt(0).toUpperCase() + t.slice(1)); };
    rec.onerror = () => setEscuchando(false);
    rec.onend = () => setEscuchando(false);
    try { rec.start(); setEscuchando(true); } catch { setEscuchando(false); }
  };

  const procesarFoto = async (file: File) => {
    setCargando(true);
    try { setFotoUrl(await comprimir(file, 600, 0.8)); } finally { setCargando(false); }
  };

  return (
    <details className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
      <summary className="cursor-pointer text-sm font-extrabold text-amber-800">➕ Producto nuevo (foto y voz)</summary>

      <form action={crearProductoBodega} className="mt-3 space-y-3">
        <input type="hidden" name="fotoUrl" value={fotoUrl ?? ""} />

        {/* Foto */}
        <div className="flex flex-col items-center gap-2">
          <button type="button" onClick={() => camRef.current?.click()}
            className="relative aspect-square w-36 overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white">
            {fotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoUrl} alt="producto" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full flex-col items-center justify-center gap-1 text-slate-400"><span className="text-3xl">📷</span><span className="text-xs font-semibold">Foto</span></span>
            )}
            {cargando && <span className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-bold">Procesando…</span>}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={() => camRef.current?.click()} className="rounded-lg bg-[#1479c4] px-3 py-1.5 text-xs font-bold text-white active:scale-95">📷 Tomar</button>
            <button type="button" onClick={() => galRef.current?.click()} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 active:scale-95">🖼️ Galería</button>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) procesarFoto(f); e.target.value = ""; }} />
          <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) procesarFoto(f); e.target.value = ""; }} />
        </div>

        {/* Nombre + voz */}
        <label className="block text-xs font-bold text-slate-600">Nombre del producto
          <div className="flex gap-2">
            <input name="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Bebida 350ml" className={inp} />
            {vozOk && (
              <button type="button" onClick={dictar} title="Dictar"
                className={`mt-1 shrink-0 rounded-lg px-3 text-white ${escuchando ? "animate-pulse bg-red-500" : "bg-[#0f766e]"}`}>🎙️</button>
            )}
          </div>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-slate-600">Línea / categoría
            <input name="linea" value={linea} onChange={(e) => setLinea(e.target.value)} placeholder="Ej: bebida, snack" className={inp} />
          </label>
          <label className="text-xs font-bold text-slate-600">Formato
            <input name="formato" value={formato} onChange={(e) => setFormato(e.target.value)} placeholder="Ej: unidad" className={inp} />
          </label>
          <label className="text-xs font-bold text-slate-600">Tipo
            <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} className={inp}>
              <option value="reventa">Reventa (comprado)</option>
              <option value="propio">Propio (fabricado)</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Cantidad que entra
            <input name="cantidad" inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="Ej: 50" className={inp} />
          </label>
          <label className="text-xs font-bold text-slate-600">⚠️ Avisar bajo
            <input name="stockMinimo" inputMode="numeric" value={stockMin} onChange={(e) => setStockMin(e.target.value)} placeholder="Ej: 10" className={inp} />
          </label>
        </div>

        <button className="w-full rounded-xl bg-[#b45309] py-3 text-base font-extrabold text-white active:scale-95">✅ Crear e ingresar a bodega</button>
        <p className="text-center text-[11px] text-slate-400">Queda con su foto y suma al stock de bodega.</p>
      </form>
    </details>
  );
}

/** Redimensiona (lado máx `max`) y comprime a JPEG data URL. */
function comprimir(file: File, max: number, calidad: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > max) { height = Math.round((height * max) / width); width = max; }
        else if (height > max) { width = Math.round((width * max) / height); height = max; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", calidad));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
