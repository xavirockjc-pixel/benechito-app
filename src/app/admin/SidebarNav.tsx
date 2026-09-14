"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string };
type Modulo = { titulo: string; activo: boolean; items: Item[] };

/**
 * Navegación del menú lateral (escritorio) con la sección actual resaltada,
 * para ver de un vistazo dónde estás dentro del panel.
 */
export default function SidebarNav({ modulos }: { modulos: Modulo[] }) {
  const pathname = usePathname();
  // Ruta activa = la opción más específica (href más largo) que coincide.
  const activoHref = modulos
    .flatMap((m) => m.items.map((i) => i.href))
    .filter((h) => pathname === h || pathname.startsWith(h + "/"))
    .sort((a, b) => b.length - a.length)[0] ?? null;

  return (
    <nav className="space-y-6">
      {modulos.map((m) => (
        <div key={m.titulo}>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            {m.titulo}
            {!m.activo && (
              <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">pronto</span>
            )}
          </p>
          <div className="space-y-0.5">
            {m.items.map((n) => {
              const activo = n.href === activoHref;
              return m.activo ? (
                <Link
                  key={n.label}
                  href={n.href}
                  aria-current={activo ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition hover:translate-x-0.5 ${
                    activo ? "bg-slate-800 text-white shadow-inner" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="text-lg">{n.icon}</span> {n.label}
                </Link>
              ) : (
                <span
                  key={n.label}
                  className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600"
                >
                  <span className="opacity-50">{n.icon}</span> {n.label}
                </span>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
