"use client";

import { useEffect, useRef, useState } from "react";

type Match = { id: string; nombreNegocio: string; comuna?: string | null; motivo: string };

/** Escucha los campos nombreNegocio/rut/whatsapp del formulario padre y avisa si el cliente ya existe. */
export default function BuscadorDuplicados({ hrefBase = "/admin/negocios/" }: { hrefBase?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    let t: ReturnType<typeof setTimeout>;
    const handler = () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        const g = (n: string) => (form.querySelector(`[name="${n}"]`) as HTMLInputElement | null)?.value ?? "";
        const nombre = g("nombreNegocio"), rut = g("rut"), whatsapp = g("whatsapp");
        if ((nombre + rut + whatsapp).trim().length < 3) { setMatches([]); return; }
        try {
          const p = new URLSearchParams({ nombre, rut, whatsapp });
          const r = await fetch(`/api/negocios/duplicados?${p.toString()}`);
          const j = await r.json();
          setMatches(Array.isArray(j.matches) ? j.matches : []);
        } catch {
          setMatches([]);
        }
      }, 400);
    };
    form.addEventListener("input", handler);
    return () => { form.removeEventListener("input", handler); clearTimeout(t); };
  }, []);

  return (
    <div ref={ref}>
      {matches.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-bold text-amber-800">⚠️ Puede que este cliente ya exista:</p>
          <ul className="mt-1 space-y-1">
            {matches.map((x) => (
              <li key={x.id}>
                <a href={`${hrefBase}${x.id}`} target="_blank" rel="noopener" className="font-semibold text-amber-900 underline">{x.nombreNegocio}</a>
                <span className="text-amber-700"> — {x.motivo}{x.comuna ? ` · ${x.comuna}` : ""}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-amber-700">Si es el mismo negocio, usa ese en vez de crear uno nuevo.</p>
        </div>
      )}
    </div>
  );
}
