"use client";

import { useEffect } from "react";
import { registrarSW } from "@/app/_shared/registrarSW";

/** Registra el service worker de la app Vendedor (PWA) con auto-actualización. */
export default function RegistrarSW() {
  useEffect(() => { registrarSW("/sw-vendedor.js", "/vendedor"); }, []);
  return null;
}
