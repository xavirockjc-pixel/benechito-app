"use client";

import { useRef, useState, useTransition } from "react";
import { agregarFotoProducto, quitarFotoProducto } from "./actions";

type Foto = { id: string; url: string };

/**
 * Galería de varias fotos por producto (en orden de subida). Sube desde
 * cámara/galería, comprime en el navegador y guarda. La primera es la principal.
 * En la tienda/vendedor/panel se ven en carrusel que rota solo.
 */
export default function GaleriaProducto({ id, fotos, nombre }: { id: string; fotos: Foto[]; nombre: string }) {
  const [cargando, setCargando] = useState(false);
  const [pending, startTransition] = useTransition();
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const procesar = async (file: File) => {
    setCargando(true);
    try {
      const dataUrl = await comprimir(file, 700, 0.8);
      const fd = new FormData();
      fd.set("id", id);
      fd.set("fotoUrl", dataUrl);
      startTransition(() => { agregarFotoProducto(fd); });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {fotos.map((f, idx) => (
          <div key={f.id} className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt={nombre} className="h-full w-full object-cover" />
            {idx === 0 && <span className="absolute left-1 top-1 rounded bg-[#1479c4] px-1 text-[9px] font-bold text-white">Principal</span>}
            <form action={quitarFotoProducto} className="absolute right-1 top-1">
              <input type="hidden" name="fotoId" value={f.id} />
              <button className="grid h-5 w-5 place-items-center rounded-full bg-black/55 text-[11px] font-bold text-white hover:bg-red-500">✕</button>
            </form>
          </div>
        ))}
        {/* Botón agregar */}
        <button type="button" onClick={() => galRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-[#1479c4]">
          <span className="text-2xl">＋</span>
          <span className="text-[10px] font-semibold">{cargando || pending ? "Subiendo…" : "Agregar"}</span>
        </button>
      </div>
      <div className="mt-1.5 flex gap-2">
        <button type="button" onClick={() => camRef.current?.click()} className="flex-1 rounded-lg bg-[#1479c4] py-1.5 text-xs font-bold text-white active:scale-95">📷 Cámara</button>
        <button type="button" onClick={() => galRef.current?.click()} className="flex-1 rounded-lg bg-slate-100 py-1.5 text-xs font-bold text-slate-700 active:scale-95">🖼️ Galería</button>
      </div>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); e.target.value = ""; }} />
      <input ref={galRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => { const fs = Array.from(e.target.files ?? []); fs.forEach((f) => procesar(f)); e.target.value = ""; }} />
    </div>
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
      img.src = String(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
