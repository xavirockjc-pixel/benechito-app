"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Avisador de pedidos nuevos: refresca la lista sola cada `segundos` y, cuando
 * entra un pedido nuevo (sube el total), SUENA y avisa en pantalla (notificación).
 * Reutilizable en Pedidos online, Caja, etc. Se activa con un toque (para permitir
 * el sonido/aviso del navegador) y recuerda la elección.
 */
const KEY = "benechito_avisos_pedidos";

export default function AvisoNuevosPedidos({ count, segundos = 15, etiqueta = "pedido" }: { count: number; segundos?: number; etiqueta?: string }) {
  const router = useRouter();
  const prev = useRef<number | null>(null);
  const wakeRef = useRef<WakeLockSentinel | null>(null);
  const [activo, setActivo] = useState(true);
  const [permiso, setPermiso] = useState<string>("default");

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (typeof Notification !== "undefined") setPermiso(Notification.permission);
      setActivo(localStorage.getItem(KEY) !== "off");
    } catch { /* ignore */ }
  }, []);

  // Refresco automático: trae los pedidos nuevos sin recargar a mano.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), segundos * 1000);
    return () => clearInterval(id);
  }, [router, segundos]);

  // Mantiene la PANTALLA ENCENDIDA mientras los avisos están activos (modo POS),
  // y la re-activa al volver a la pestaña. Se libera al silenciar o salir.
  useEffect(() => {
    let cancelado = false;
    const pedir = async () => {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinel> } };
        if (activo && nav.wakeLock && document.visibilityState === "visible") {
          wakeRef.current = await nav.wakeLock.request("screen");
        }
      } catch { /* ignore */ }
    };
    const onVis = () => { if (!cancelado && document.visibilityState === "visible") pedir(); };
    if (activo) { pedir(); document.addEventListener("visibilitychange", onVis); }
    return () => {
      cancelado = true;
      document.removeEventListener("visibilitychange", onVis);
      try { wakeRef.current?.release(); wakeRef.current = null; } catch { /* ignore */ }
    };
  }, [activo]);

  const ding = () => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const notas = [880, 1175];
      notas.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine"; o.frequency.value = f;
        const t = ctx.currentTime + i * 0.18;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.start(t); o.stop(t + 0.32);
      });
    } catch { /* ignore */ }
  };

  // Alerta repetida (más notoria, tipo POS): suena varias veces al entrar un pedido.
  const alerta = () => { [0, 800, 1600].forEach((ms) => setTimeout(ding, ms)); };

  // Detecta pedidos nuevos (sube el total) y avisa.
  useEffect(() => {
    if (prev.current != null && count > prev.current && activo) {
      const nuevos = count - prev.current;
      alerta();
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("🛒 Pedido nuevo", {
            body: `Entró ${nuevos} ${etiqueta}${nuevos > 1 ? "s" : ""} nuevo${nuevos > 1 ? "s" : ""}. Revísalo.`,
            tag: "benechito-nuevo-pedido",
            icon: "/icons/icon-192.png",
          });
        }
      } catch { /* ignore */ }
    }
    prev.current = count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, activo]);

  const activar = async () => {
    try {
      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        const p = await Notification.requestPermission();
        setPermiso(p);
      }
    } catch { /* ignore */ }
    setActivo(true);
    try { localStorage.setItem(KEY, "on"); } catch { /* ignore */ }
    ding(); // confirma que quedó sonando
  };

  const silenciar = () => {
    setActivo(false);
    try { localStorage.setItem(KEY, "off"); } catch { /* ignore */ }
  };

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <span className="font-bold text-slate-600">
        {activo ? "🔔 " : "🔕 "}
        {activo
          ? (permiso === "granted" ? "Avisos de pedidos activos (sonido + pantalla)" : "Avisos con sonido activos — toca para avisos en pantalla")
          : "Avisos silenciados"}
      </span>
      {activo
        ? <button onClick={silenciar} className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 font-bold text-slate-500">Silenciar</button>
        : <button onClick={activar} className="shrink-0 rounded-lg bg-[#0f766e] px-2.5 py-1 font-extrabold text-white">Activar</button>}
    </div>
  );
}
