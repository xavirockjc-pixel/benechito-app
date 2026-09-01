"use client";

import { useState } from "react";
import Link from "next/link";

type Item = { href: string; label: string; icon: string };
type Modulo = { titulo: string; items: Item[] };

/**
 * Menú desplegable para el celular: botón ☰ → cajón con secciones plegables.
 * Al tocar una opción navega a esa página y se cierra.
 */
export default function MenuMovil({ modulos }: { modulos: Modulo[] }) {
  const [open, setOpen] = useState(false);
  const [exp, setExp] = useState<string | null>(modulos[0]?.titulo ?? null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-bold text-white active:scale-95"
        aria-label="Abrir menú"
      >
        ☰ Menú
      </button>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-0 flex h-full w-80 max-w-[86%] flex-col overflow-y-auto p-4 shadow-2xl"
            style={{ background: "var(--surface)" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display text-lg font-extrabold text-slate-900">Menú</span>
              <button type="button" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-2xl leading-none text-slate-600" aria-label="Cerrar">×</button>
            </div>

            <div className="space-y-2">
              {modulos.map((m) => {
                const abierto = exp === m.titulo;
                return (
                  <div key={m.titulo} className="overflow-hidden rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setExp(abierto ? null : m.titulo)}
                      className="flex w-full items-center justify-between px-3 py-3 text-left text-sm font-extrabold text-slate-800"
                      style={{ background: "var(--surface-2)" }}
                    >
                      {m.titulo}
                      <span className="text-xs text-slate-500">{abierto ? "▲" : "▼"}</span>
                    </button>
                    {abierto && (
                      <div className="p-1">
                        {m.items.map((n) => (
                          <Link
                            key={n.href}
                            href={n.href}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 active:bg-slate-100"
                          >
                            <span className="text-lg">{n.icon}</span> {n.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
