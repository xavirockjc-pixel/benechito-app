"use client";

import { useEffect, useState } from "react";

/**
 * Botón flotante para cambiar entre modo claro y oscuro.
 * El tema se guarda en localStorage ("tema") y se aplica antes de pintar
 * con el script sin-parpadeo del layout raíz. Aparece en TODAS las apps.
 */
export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [listo, setListo] = useState(false);

  useEffect(() => {
    const t = document.documentElement.getAttribute("data-theme");
    setDark(t === "dark");
    setListo(true);
  }, []);

  function toggle() {
    const next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("tema", next);
    } catch {
      /* modo privado: se ignora */
    }
    setDark(!dark);
  }

  return (
    <button
      type="button"
      className="theme-fab"
      onClick={toggle}
      aria-label="Cambiar entre modo claro y oscuro"
      title="Modo claro / oscuro"
    >
      {listo ? (dark ? "☀️ Claro" : "🌙 Oscuro") : "🌗 Tema"}
    </button>
  );
}
