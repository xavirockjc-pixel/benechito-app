"use client";

import { useState } from "react";
import { solicitarAcceso } from "./actions";

export default function PedirAccesoBtn() {
  const [estado, setEstado] = useState<"" | "enviando" | "ok">("");

  async function pedir() {
    if (estado) return;
    setEstado("enviando");
    try { await solicitarAcceso(); setEstado("ok"); } catch { setEstado(""); }
  }

  if (estado === "ok") {
    return (
      <p className="max-w-xs rounded-xl bg-sky-500/20 px-4 py-3 text-sm font-semibold text-sky-200">
        ✅ Solicitud enviada. Espera que el administrador te autorice y vuelve a intentar (recarga la app).
      </p>
    );
  }

  return (
    <button type="button" onClick={pedir}
      className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-bold text-white active:brightness-110 disabled:opacity-60"
      disabled={estado === "enviando"}>
      {estado === "enviando" ? "Enviando…" : "🙋 Pedir permiso al administrador"}
    </button>
  );
}
