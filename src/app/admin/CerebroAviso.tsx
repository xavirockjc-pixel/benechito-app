"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Aviso del cerebro ("N cosas por revisar") en el inicio, con botón Omitir: una vez
 * omitido no se vuelve a mostrar, salvo que aparezcan MÁS cosas nuevas que revisar.
 */
export default function CerebroAviso({ n }: { n: number }) {
  const [oculto, setOculto] = useState(true);

  useEffect(() => {
    try {
      const omitidoN = Number(localStorage.getItem("cerebro-omitido-n") || "0");
      setOculto(n <= omitidoN);
    } catch { setOculto(false); }
  }, [n]);

  if (oculto || n <= 0) return null;

  const omitir = () => {
    try { localStorage.setItem("cerebro-omitido-n", String(n)); } catch { /* ignore */ }
    setOculto(true);
  };

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
      <Link href="/admin/pendientes" className="min-w-0">
        <span className="block text-base font-extrabold text-amber-800">🐝 El cerebro notó {n} cosa{n > 1 ? "s" : ""} por revisar</span>
        <span className="block text-sm text-amber-700">Algo quedó sin actualizar o sin cuadrar. Toca para arreglar.</span>
      </Link>
      <button onClick={omitir} className="shrink-0 rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700">✕ Omitir</button>
    </div>
  );
}
