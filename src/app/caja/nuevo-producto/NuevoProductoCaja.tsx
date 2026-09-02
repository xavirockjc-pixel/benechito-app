"use client";

import { useEffect, useRef, useState } from "react";
import { agregarProductoCaja } from "../actions";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  start: () => void; stop: () => void;
  onresult: ((e: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null; onend: (() => void) | null;
};

const lineaLabel: Record<string, string> = {
  trufa: "Trufas", cuchufli: "Cuchuflís", helado: "Helados", proteico: "Proteicos",
  paleta: "Paletas", cocada: "Cocadas", postre: "Postres", bebida: "Bebidas", snack: "Snacks", otro: "Otro",
};
const inp = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#0f7a44]";

export default function NuevoProductoCaja({ lineas }: { lineas: string[] }) {
  const [nombre, setNombre] = useState("");
  const [linea, setLinea] = useState("");
  const [formato, setFormato] = useState("");
  const [tipo, setTipo] = useState("reventa");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
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
    <form action={agregarProductoCaja} className="mx-auto max-w-md space-y-3">
      <input type="hidden" name="fotoUrl" value={fotoUrl ?? ""} />

      {/* Foto: tomar o galería */}
      <div className="flex flex-col items-center gap-2">
        <button type="button" onClick={() => camRef.current?.click()}
          className="relative aspect-square w-40 overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50">
          {fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotoUrl} alt="producto" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full flex-col items-center justify-center gap-1 text-slate-400"><span className="text-3xl">📷</span><span className="text-xs font-semibold">Foto del producto</span></span>
          )}
          {cargando && <span className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-bold">Procesando…</span>}
        </button>
        <div className="flex gap-2">
          <button type="button" onClick={() => camRef.current?.click()} className="rounded-lg bg-[#1479c4] px-3 py-1.5 text-xs font-bold text-white active:scale-95">📷 Tomar foto</button>
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
        <label className="text-xs font-bold text-slate-600">Línea
          <select name="linea" required value={linea} onChange={(e) => setLinea(e.target.value)} className={inp}>
            <option value="">Elige…</option>
            {lineas.map((l) => <option key={l} value={l}>{lineaLabel[l] ?? l}</option>)}
          </select>
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
        <label className="text-xs font-bold text-slate-600">Precio de venta $
          <input name="precio" inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="Ej: 1200" className={inp} />
        </label>
        <label className="text-xs font-bold text-slate-600">Stock inicial (local)
          <input name="stock" inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="Ej: 24" className={inp} />
        </label>
      </div>

      <button className="w-full rounded-xl bg-[#0f7a44] py-3 text-base font-extrabold text-white active:scale-95">✅ Agregar al local</button>
      <p className="text-center text-[11px] text-slate-400">Queda con su foto, aparece en Vender y se descuenta del stock del local.</p>
    </form>
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
      img.onerror = reject; img.src = String(reader.result);
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}
