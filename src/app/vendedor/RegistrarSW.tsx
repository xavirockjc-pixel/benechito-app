"use client";

import { useEffect } from "react";

/** Registra el service worker de la app Vendedor (habilita instalación como PWA). */
export default function RegistrarSW() {
  useEffect(() => {
    // Solo en producción: en desarrollo el SW interfiere con la carga de módulos.
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-vendedor.js", { scope: "/vendedor" }).catch(() => {});
    }
  }, []);
  return null;
}
