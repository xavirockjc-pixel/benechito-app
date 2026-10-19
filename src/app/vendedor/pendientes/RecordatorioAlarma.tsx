"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Alarma de pedidos por entregar: mientras la app esté abierta, cada 15 min te
 * recuerda (notificación + sonido) los pedidos de hoy/atrasados sin entregar.
 * Se activa con un toque y recuerda tu elección en el teléfono.
 */
const MIN = 15; // cada cuántos minutos insiste
const KEY = "benechito_alarma_vend";

export default function RecordatorioAlarma({ urgentes }: { urgentes: number }) {
  const [permiso, setPermiso] = useState<string>("default");
  const [activo, setActivo] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (typeof Notification !== "undefined") setPermiso(Notification.permission);
      setActivo(localStorage.getItem(KEY) === "on");
    } catch { /* ignore */ }
  }, []);

  const beep = () => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = "sine"; o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      o.start(); o.stop(ctx.currentTime + 0.6);
    } catch { /* ignore */ }
  };

  const avisar = () => {
    if (urgentes <= 0) return;
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("🛵 Pedidos por entregar", {
          body: `Tienes ${urgentes} pedido${urgentes > 1 ? "s" : ""} sin entregar. Tiquéalos al entregar.`,
          tag: "benechito-pendientes",
          icon: "/icons/icon-192.png",
        });
      }
    } catch { /* ignore */ }
    beep();
  };

  useEffect(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (!activo || urgentes <= 0) return;
    const t0 = setTimeout(avisar, 10000); // confirma a los 10s que quedó andando
    timer.current = setInterval(avisar, MIN * 60 * 1000);
    return () => { clearTimeout(t0); if (timer.current) clearInterval(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, urgentes]);

  const activar = async () => {
    try {
      if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
        const p = await Notification.requestPermission();
        setPermiso(p);
      }
    } catch { /* ignore */ }
    setActivo(true);
    try { localStorage.setItem(KEY, "on"); } catch { /* ignore */ }
  };

  const silenciar = () => {
    setActivo(false);
    try { localStorage.setItem(KEY, "off"); } catch { /* ignore */ }
  };

  if (urgentes <= 0) return null;

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3">
      <p className="text-sm font-extrabold text-rose-700">⏰ {urgentes} pedido{urgentes > 1 ? "s" : ""} por entregar</p>
      {activo ? (
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-rose-600">
            🔔 Recordatorio activo{permiso === "granted" ? " · te aviso cada 15 min" : " · suena cada 15 min (toca para permitir avisos en pantalla)"}
          </p>
          <button onClick={silenciar} className="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-rose-500">Silenciar</button>
        </div>
      ) : (
        <button onClick={activar} className="mt-2 w-full rounded-lg bg-rose-600 py-2 text-sm font-extrabold text-white active:scale-95">🔔 Recordarme cada 15 min</button>
      )}
      <p className="mt-1 text-[11px] text-rose-400">Recuerda mientras la app está abierta. Para avisarte con la app cerrada hace falta activar notificaciones push (lo vemos aparte).</p>
    </div>
  );
}
