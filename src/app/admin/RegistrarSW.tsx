"use client";

import { useEffect } from "react";

/** Registra el service worker del Panel (habilita instalarlo como app en el celular). */
export default function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-panel.js", { scope: "/admin" }).catch(() => {});
    }
  }, []);
  return null;
}
