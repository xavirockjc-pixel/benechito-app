"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PendienteCerebro } from "@/lib/dominio/cerebroPendientes";

const TONO: Record<string, { bg: string; ring: string; txt: string }> = {
  alerta: { bg: "bg-rose-50", ring: "ring-rose-200", txt: "text-rose-700" },
  aviso: { bg: "bg-amber-50", ring: "ring-amber-200", txt: "text-amber-700" },
  info: { bg: "bg-slate-50", ring: "ring-slate-200", txt: "text-slate-600" },
};

const hoyClave = () => new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

/**
 * Lista de pendientes del cerebro. "Arreglar" lleva a la pantalla; "Omitir por hoy"
 * lo esconde solo por hoy (se guarda en el navegador, no borra nada). Mañana vuelve
 * a aparecer si sigue sin resolverse.
 */
export default function PendientesCerebro({ items }: { items: PendienteCerebro[] }) {
  const [estado, setEstado] = useState<{ listo: boolean; omitidos: Set<string> }>({ listo: false, omitidos: new Set() });
  const { listo, omitidos } = estado;

  useEffect(() => {
    let claves: string[] = [];
    try {
      const raw = localStorage.getItem("cerebro-omitidos");
      const data = raw ? JSON.parse(raw) : null;
      if (data && data.dia === hoyClave() && Array.isArray(data.claves)) claves = data.claves;
    } catch { /* navegador sin storage: no pasa nada */ }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstado({ listo: true, omitidos: new Set(claves) });
  }, []);

  const omitir = (clave: string) => {
    setEstado((prev) => {
      const next = new Set(prev.omitidos); next.add(clave);
      try { localStorage.setItem("cerebro-omitidos", JSON.stringify({ dia: hoyClave(), claves: [...next] })); } catch { /* ignore */ }
      return { listo: true, omitidos: next };
    });
  };
  const restaurar = () => {
    try { localStorage.removeItem("cerebro-omitidos"); } catch { /* ignore */ }
    setEstado({ listo: true, omitidos: new Set() });
  };

  if (!listo) return null;
  const visibles = items.filter((i) => !omitidos.has(i.clave));
  const nOmitidos = items.length - visibles.length;

  if (items.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-3xl">✅</p>
        <p className="mt-1 font-extrabold text-green-800">Todo al día</p>
        <p className="mt-0.5 text-sm text-green-700">El cerebro no encontró nada pendiente por revisar. ¡Buen trabajo!</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {visibles.length === 0 ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6 text-center">
          <p className="text-2xl">🌙</p>
          <p className="mt-1 font-bold text-green-800">Todo omitido por hoy</p>
        </div>
      ) : (
        visibles.map((it) => {
          const t = TONO[it.tono] ?? TONO.info;
          return (
            <div key={it.clave} className={`rounded-2xl p-4 ring-1 ${t.bg} ${t.ring}`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none">{it.icono}</span>
                <div className="min-w-0 flex-1">
                  <p className={`font-extrabold ${t.txt}`}>{it.titulo}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{it.detalle}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link href={it.href} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white active:scale-95">
                      🔧 {it.cta}
                    </Link>
                    <button onClick={() => omitir(it.clave)} className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-500 active:scale-95">
                      Omitir por hoy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}

      {nOmitidos > 0 && (
        <button onClick={restaurar} className="w-full rounded-xl border border-dashed border-slate-300 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600">
          Mostrar {nOmitidos} omitido{nOmitidos > 1 ? "s" : ""} de hoy
        </button>
      )}
    </div>
  );
}
