"use client";

import { useEffect, useState } from "react";

/**
 * Carrusel de fotos que ROTA SOLO (cada `intervalo` ms) entre las imágenes del
 * producto, en orden de subida. Si hay una sola, la muestra fija; si no hay,
 * muestra un ícono. Reutilizable en tienda, vendedor y panel.
 */
export default function CarruselFotos({
  urls,
  alt = "",
  intervalo = 2800,
  vacio = "🍫",
  className = "",
}: {
  urls: string[];
  alt?: string;
  intervalo?: number;
  vacio?: string;
  className?: string;
}) {
  const fotos = urls.filter(Boolean);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (fotos.length <= 1) return;
    const t = setInterval(() => setI((x) => (x + 1) % fotos.length), intervalo);
    return () => clearInterval(t);
  }, [fotos.length, intervalo]);

  if (fotos.length === 0) {
    return <span className={`flex items-center justify-center bg-slate-100 text-3xl text-slate-300 ${className}`}>{vacio}</span>;
  }

  return (
    <span className={`relative block overflow-hidden bg-slate-100 ${className}`}>
      {fotos.map((u, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={idx}
          src={u}
          alt={alt}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${idx === i % fotos.length ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      {fotos.length > 1 && (
        <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1">
          {fotos.map((_, idx) => (
            <span key={idx} className={`h-1.5 w-1.5 rounded-full ${idx === i % fotos.length ? "bg-white" : "bg-white/50"}`} />
          ))}
        </span>
      )}
    </span>
  );
}
