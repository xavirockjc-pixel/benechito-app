"use client";

import { useState } from "react";
import { categoriaCapLabel, categoriaCapIcon } from "@/lib/dominio/checklists";

type Firmante = { nombre: string; fecha: string };
type Cap = {
  id: string; titulo: string; categoria: string; descripcion: string | null;
  pasos: string | null; urlVideo: string | null; embed: string | null;
  firmadaPorMi: boolean; firmantes: Firmante[];
};
type Tab = { id: string; label: string; caps: Cap[] };

const fmt = (iso: string) => new Date(iso).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function CapacitacionesUI({
  worker, tabs, firmar, salir,
}: {
  worker: string;
  tabs: Tab[];
  firmar: (fd: FormData) => Promise<void>;
  salir: () => Promise<void>;
}) {
  const [activa, setActiva] = useState(tabs[0]?.id ?? "");
  const tab = tabs.find((t) => t.id === activa) ?? tabs[0];
  const caps = tab?.caps ?? [];
  const firmadas = caps.filter((c) => c.firmadaPorMi).length;

  return (
    <div>
      {/* Identidad del trabajador */}
      <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2">
        <span className="min-w-0 truncate text-sm font-bold text-[#0f766e]">👤 {worker}</span>
        <form action={salir}><button className="shrink-0 text-xs font-semibold text-slate-500 underline">Cambiar</button></form>
      </div>

      {/* Pestañas por producto/área */}
      <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {tabs.map((t) => {
          const on = t.id === activa;
          const pend = t.caps.filter((c) => !c.firmadaPorMi).length;
          return (
            <button key={t.id} type="button" onClick={() => setActiva(t.id)}
              className={`shrink-0 rounded-full border-2 px-3 py-1.5 text-xs font-bold ${on ? "border-[#0f766e] bg-[#0f766e] text-white" : "border-slate-200 bg-white text-slate-600"}`}>
              {t.label}{pend > 0 && <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${on ? "bg-white/25" : "bg-red-100 text-red-600"}`}>{pend}</span>}
            </button>
          );
        })}
      </div>

      <p className="mb-2 text-xs font-semibold text-slate-400">{firmadas} de {caps.length} firmadas en {tab?.label}</p>

      <div className="space-y-4">
        {caps.map((c) => (
          <div key={c.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${c.firmadaPorMi ? "border-green-200" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-display text-base font-extrabold text-slate-900">{c.titulo}</p>
              {c.firmadaPorMi && <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">✓ Firmada</span>}
            </div>
            <p className="text-xs text-slate-500">{categoriaCapIcon[c.categoria] ?? "🎓"} {categoriaCapLabel[c.categoria] ?? c.categoria}</p>
            {c.descripcion && <p className="mt-2 text-sm text-slate-600">{c.descripcion}</p>}

            {c.embed ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <iframe src={c.embed} className="aspect-video w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={c.titulo} />
              </div>
            ) : c.urlVideo ? (
              <a href={c.urlVideo} target="_blank" rel="noopener" className="mt-3 inline-block rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-bold text-white">▶ Ver video</a>
            ) : null}

            {c.pasos && (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Paso a paso</p>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{c.pasos}</p>
              </div>
            )}

            {/* Firma / constancia */}
            {c.firmadaPorMi ? (
              <p className="mt-3 rounded-xl bg-green-50 px-3 py-2 text-sm font-bold text-green-700">
                ✅ Leída y firmada por {worker}
              </p>
            ) : (
              <form action={firmar} className="mt-3">
                <input type="hidden" name="capacitacionId" value={c.id} />
                <button className="w-full rounded-xl bg-[#0f766e] py-3 text-sm font-extrabold text-white active:brightness-110">
                  ✍️ Leí y firmo esta capacitación
                </button>
              </form>
            )}

            {/* Copia: quiénes la han firmado */}
            {c.firmantes.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[11px] font-semibold text-slate-400">👥 Firmada por {c.firmantes.length} — ver copia</summary>
                <ul className="mt-1 space-y-0.5">
                  {c.firmantes.map((f, i) => (
                    <li key={i} className="text-[11px] text-slate-500">✓ {f.nombre} · {fmt(f.fecha)}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        ))}
        {caps.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No hay capacitaciones en esta sección.</p>}
      </div>
    </div>
  );
}
