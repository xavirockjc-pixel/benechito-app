"use client";

import Link from "next/link";
import { useState } from "react";

type Item = { label: string; valor: string; href: string; accent: string };

/**
 * Indicadores comerciales con montos ocultos por defecto. Un ojito revela/oculta
 * todos los valores en dinero.
 */
export default function PanelMontos({ items }: { items: Item[] }) {
  const [ver, setVer] = useState(false);

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Resumen comercial</h2>
        <button
          type="button"
          onClick={() => setVer((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 active:bg-slate-50"
        >
          {ver ? "🙈 Ocultar montos" : "👁️ Ver montos"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className={`text-2xl font-extrabold ${k.accent}`}>{ver ? k.valor : "••••••"}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{k.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
