"use client";

import { useEffect, useRef } from "react";

/**
 * Detecta cuando se desplegó una versión nueva (consultando /api/version) y recarga
 * la pestaña para tomar la versión fresca. Así se evita el error "Failed to find
 * Server Action" por quedar con una pestaña vieja abierta tras un deploy.
 * No recarga si estás escribiendo en un campo (para no interrumpirte).
 */
export default function AutoActualizar() {
  const base = useRef<string | null>(null);
  const recargando = useRef(false);

  useEffect(() => {
    let vivo = true;

    const escribiendo = () => {
      const el = document.activeElement as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    };

    const revisar = async () => {
      if (!vivo || recargando.current) return;
      try {
        const r = await fetch("/api/version", { cache: "no-store" });
        if (!r.ok) return;
        const { v } = await r.json();
        if (!v) return;
        if (base.current == null) { base.current = v; return; }
        if (v !== base.current && !escribiendo()) {
          recargando.current = true;
          window.location.reload();
        }
      } catch { /* ignore */ }
    };

    revisar();
    const id = setInterval(() => { if (document.visibilityState === "visible") revisar(); }, 60 * 1000);
    const onVis = () => { if (document.visibilityState === "visible") revisar(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      vivo = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);

  return null;
}
