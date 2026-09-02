"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { contarPedidosPendientes } from "./actions";

/**
 * Aviso EN VIVO de pedidos por preparar, dentro de la app del local.
 * Muestra un badge con el número de pedidos pendientes en el menú y, cuando
 * ENTRA uno nuevo, suena un beep y el botón parpadea. Consulta cada 15 s.
 */
export default function AvisoPedidos() {
  const [n, setN] = useState<number | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const prev = useRef<number | null>(null);

  const beep = () => {
    try {
      const AC = (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      const ctx = new AC();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      o.start(); o.stop(ctx.currentTime + 0.36);
    } catch { /* sin audio, no pasa nada */ }
  };

  useEffect(() => {
    let vivo = true;
    const revisar = async () => {
      try {
        const c = await contarPedidosPendientes();
        if (!vivo) return;
        if (prev.current != null && c > prev.current) { beep(); setNuevo(true); setTimeout(() => setNuevo(false), 6000); }
        prev.current = c; setN(c);
      } catch { /* reintenta luego */ }
    };
    revisar();
    const id = setInterval(revisar, 15000);
    return () => { vivo = false; clearInterval(id); };
  }, []);

  return (
    <Link
      href="/caja/pedidos"
      className={`relative rounded-lg px-3 py-1.5 font-bold ${nuevo ? "animate-pulse bg-amber-400 text-amber-950" : "text-slate-700"}`}
    >
      📋 Pedidos
      {n != null && n > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-extrabold text-white">{n}</span>
      )}
    </Link>
  );
}
