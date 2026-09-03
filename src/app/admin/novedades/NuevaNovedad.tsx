"use client";

import { useRef, useState } from "react";
import { crearNovedad } from "./actions";

/**
 * Publica una novedad para el Portal del Cliente: promo, nuevo producto o nuevo
 * sabor, con foto (cámara/galería, comprimida en el navegador), título, texto y
 * el botón (CTA). Aparece en "Mi Benechito" de todos los clientes.
 */
export default function NuevaNovedad() {
  const [preview, setPreview] = useState<string | null>(null);
  const [foto, setFoto] = useState<string>("");
  const [cargando, setCargando] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const procesar = async (file: File) => {
    setCargando(true);
    try {
      const dataUrl = await comprimir(file, 900, 0.82);
      setPreview(dataUrl);
      setFoto(dataUrl);
    } finally {
      setCargando(false);
    }
  };

  return (
    <form
      ref={formRef}
      action={async (fd) => { fd.set("fotoUrl", foto); await crearNovedad(fd); formRef.current?.reset(); setPreview(null); setFoto(""); }}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <p className="mb-3 text-sm font-bold text-slate-700">➕ Nueva novedad para el portal</p>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
        {/* Foto */}
        <div>
          <button type="button" onClick={() => camRef.current?.click()} className="relative grid aspect-square w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Novedad" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-slate-400"><span className="text-3xl">📷</span><span className="text-xs font-semibold">Agregar foto</span></span>
            )}
            {cargando && <span className="absolute inset-0 grid place-items-center bg-white/70 text-xs font-bold text-slate-600">Procesando…</span>}
          </button>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => camRef.current?.click()} className="flex-1 rounded-lg bg-[#1479c4] py-1.5 text-xs font-bold text-white">📷 Foto</button>
            <button type="button" onClick={() => galRef.current?.click()} className="flex-1 rounded-lg bg-slate-100 py-1.5 text-xs font-bold text-slate-700">🖼️ Galería</button>
          </div>
          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); e.target.value = ""; }} />
          <input ref={galRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) procesar(f); e.target.value = ""; }} />
        </div>

        {/* Datos */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <label className="text-xs font-bold text-slate-600">Tipo
              <select name="tipo" defaultValue="promo" className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm">
                <option value="promo">🔥 Promoción</option>
                <option value="nuevo">✨ Nuevo producto</option>
                <option value="sabor">🍦 Nuevo sabor</option>
              </select>
            </label>
            <label className="flex-1 text-xs font-bold text-slate-600">Botón (CTA)
              <input name="cta" placeholder="Ej: Pedir ahora" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-xs font-bold text-slate-600">Título
            <input name="titulo" required placeholder="Ej: 2x1 en Trufas esta semana" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="block text-xs font-bold text-slate-600">Descripción
            <textarea name="descripcion" rows={2} placeholder="Detalle de la promo o del nuevo producto…" className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <button className="w-full rounded-lg bg-[#1479c4] py-2.5 text-sm font-extrabold text-white active:scale-95">Publicar novedad</button>
        </div>
      </div>
    </form>
  );
}

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
