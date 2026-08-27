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
  const inputRef = useRef<HTMLInputElement>(null);

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
        onClick={() => inputRef.current?.click()}
        className="relative aspect-square w-full overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-[#1479c4]"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={nombre} className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full flex-col items-center justify-center gap-1 text-slate-400">
            <span className="text-3xl">📷</span>
            <span className="text-xs font-semibold">Subir foto</span>
          </span>
        )}
        {(cargando || pending) && <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-xs font-bold text-slate-600">Guardando…</span>}
      </button>
      {preview && <button type="button" onClick={() => inputRef.current?.click()} className="text-xs font-semibold text-[#1479c4]">Cambiar</button>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); }}
      />
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
