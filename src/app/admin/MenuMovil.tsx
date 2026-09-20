"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string };
type Modulo = { titulo: string; items: Item[] };

/**
 * Menú desplegable para el celular: botón ☰ → cajón con secciones plegables.
 * Al tocar una opción navega a esa página y se cierra. Resalta dónde estás y
 * abre el grupo que contiene la página actual.
 */
export default function MenuMovil({ modulos, apps = [] }: { modulos: Modulo[]; apps?: Item[] }) {
  const pathname = usePathname();
  // Ruta activa = la opción más específica (href más largo) que coincide.
  const activoHref = modulos
    .flatMap((m) => m.items.map((i) => i.href))
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0] ?? null;
  const moduloActivo = modulos.find((m) => m.items.some((i) => i.href === activoHref))?.titulo;

  const [open, setOpen] = useState(false);
  const [exp, setExp] = useState<string | null>(moduloActivo ?? modulos[0]?.titulo ?? null);

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
                        {m.items.map((n) => {
                          const activo = n.href === activoHref;
                          return (
                            <Link
                              key={n.href}
                              href={n.href}
                              onClick={() => setOpen(false)}
                              aria-current={activo ? "page" : undefined}
                              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold active:bg-slate-100 ${activo ? "bg-[#1479c4]/10 text-[#1479c4]" : "text-slate-700"}`}
                            >
                              <span className="text-lg">{n.icon}</span> {n.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {apps.length > 0 && (
              <div className="mt-4">
                <p className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Apps</p>
                <div className="grid grid-cols-2 gap-2">
                  {apps.map((a) => (
                    <Link
                      key={a.href}
                      href={a.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 active:bg-slate-100"
                      style={{ background: "var(--surface-2)" }}
                    >
                      <span className="text-lg">{a.icon}</span> {a.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
