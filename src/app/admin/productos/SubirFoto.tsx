"use client";

import { useRef, useState, useTransition } from "react";
import { guardarFotoProducto } from "./actions";

/**
 * Sube una imagen desde el equipo/celular, la redimensiona y comprime en el navegador
 * (máx ~600px, JPEG) y la guarda como data URL en el producto. Sin servicios externos.
 */
export default function SubirFoto({ id, fotoUrl, nombre }: { id: string; fotoUrl: string | null; nombre: string }) {
  const [preview, setPreview] = useState<string | null>(fotoUrl);
  const [cargando, setCargando] = useState(false);
  const [pending, startTransition] = useTransition();
  const camRef = useRef<HTMLInputElement>(null);   // cámara
  const galRef = useRef<HTMLInputElement>(null);   // galería / archivos

  const procesar = async (file: File) => {
    setCargando(true);
    try {
      const dataUrl = await comprimir(file, 600, 0.8);
      setPreview(dataUrl);
      const fd = new FormData();
      fd.set("id", id);
      fd.set("fotoUrl", dataUrl);
      startTransition(() => { guardarFotoProducto(fd); });
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => camRef.current?.click()}
        className="relative aspect-square w-full overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-[#1479c4]"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={nombre} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
            <span className="text-3xl">📷</span>
            <span className="text-xs font-semibold">Agregar foto</span>
          </span>
        )}
        {(cargando || pending) && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-bold text-slate-600">Guardando…</span>}
      </button>
      {/* Dos opciones: tomar con la cámara o elegir de la galería */}
      <div className="flex w-full gap-2">
        <button type="button" onClick={() => camRef.current?.click()} className="flex-1 rounded-lg bg-[#1479c4] py-1.5 text-xs font-bold text-white active:scale-95">📷 Tomar foto</button>
        <button type="button" onClick={() => galRef.current?.click()} className="flex-1 rounded-lg bg-slate-100 py-1.5 text-xs font-bold text-slate-700 active:scale-95">🖼️ Galería</button>
      </div>
      {/* Cámara trasera del celular */}
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); e.target.value = ""; }} />
      {/* Galería / archivos */}
      <input ref={galRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); e.target.value = ""; }} />
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
