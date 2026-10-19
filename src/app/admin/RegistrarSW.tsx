"use client";

import { useEffect } from "react";
import { registrarSW } from "@/app/_shared/registrarSW";

/** Registra el service worker del Panel (PWA) con auto-actualización. */
export default function RegistrarSW() {
  useEffect(() => { registrarSW("/sw-panel.js", "/admin"); }, []);
  return null;
}
