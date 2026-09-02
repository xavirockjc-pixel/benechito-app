"use client";

import { useRef, useState, useTransition } from "react";
import { guardarSabor } from "./actions";

/**
 * Editor compacto por sabor: subir/cambiar su foto (cámara o galería, comprimida
 * en el navegador) y escribir su descripción "de qué está hecho". Ambos se ven en
 * la tienda cuando el cliente selecciona el sabor.
 */
export default function EditarSabor({ id, nombre, fotoUrl, descripcion }: { id: string; nombre: string; fotoUrl: string | null; descripcion: string | null }) {
  const [abierto, setAbierto] = useState(false);
  const [preview, setPreview] = useState<string | null>(fotoUrl);
  const [cargando, setCargando] = useState(false);
  const [pending, startTransition] = useTransition();
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const procesar = async (file: File) => {
    setCargando(true);
    try {
      const dataUrl = await comprimir(file, 600, 0.8);
      setPreview(dataUrl);
      const fd = new FormData();
      fd.set("id", id);
      fd.set("fotoUrl", dataUrl);
      startTransition(() => { guardarSabor(fd); });
    } finally {
      setCargando(false);
    }
  };

  const tiene = Boolean(fotoUrl || descripcion);

  return (
    <div className="mt-1">
      <button type="button" onClick={() => setAbierto((v) => !v)} className={`text-[11px] font-bold ${tiene ? "text-verde" : "text-[#1479c4]"}`}>
        {tiene ? "🖼️ Editar ficha" : "＋ Foto y descripción"}
      </button>

      {abierto && (
        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
          <div className="flex gap-2">
            {/* Miniatura / subir */}
            <button type="button" onClick={() => camRef.current?.click()} className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-white">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={nombre} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg text-slate-400">📷</span>
              )}
              {(cargando || pending) && <span className="absolute inset-0 grid place-items-center bg-white/70 text-[9px] font-bold text-slate-600">…</span>}
            </button>
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex gap-1">
                <button type="button" onClick={() => camRef.current?.click()} className="flex-1 rounded bg-[#1479c4] py-1 text-[10px] font-bold text-white">📷 Foto</button>
                <button type="button" onClick={() => galRef.current?.click()} className="flex-1 rounded bg-slate-200 py-1 text-[10px] font-bold text-slate-700">🖼️ Galería</button>
              </div>
              {/* Descripción */}
              <form action={guardarSabor} className="flex gap-1">
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="fotoUrl" value="__keep__" />
                <input name="descripcion" defaultValue={descripcion ?? ""} placeholder="De qué está hecho…" className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-xs" />
                <button className="shrink-0 rounded bg-slate-700 px-2 py-1 text-[10px] font-bold text-white">Guardar</button>
              </form>
            </div>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); e.target.value = ""; }} />
          <input ref={galRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); e.target.value = ""; }} />
        </div>
      )}
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
