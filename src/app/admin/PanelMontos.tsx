"use client";

import Link from "next/link";
import { useState } from "react";

type Item = { label: string; valor: string; href: string; color: string; icon: string };

/**
 * Indicadores comerciales con montos ocultos por defecto. Un ojito revela/oculta
 * todos los valores en dinero. Tarjetas coloridas (una por indicador).
 */
export default function PanelMontos({ items }: { items: Item[] }) {
  const [ver, setVer] = useState(false);

  return (
    <div className="mt-7">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-lg font-extrabold text-slate-900">Resumen del negocio</h2>
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 active:scale-95"
        >
          {ver ? "🙈 Ocultar montos" : "👁️ Ver montos"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((k) => (
          <Link key={k.label} href={k.href} className="kpi-card card-dyn" style={{ "--kc": k.color } as React.CSSProperties}>
            <div className="kpi-ic">{k.icon}</div>
            <p className="kpi-lab">{k.label}</p>
            <p className="kpi-val" style={{ filter: ver ? "none" : "blur(9px)", userSelect: ver ? "auto" : "none" }}>
              {k.valor}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
