"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; icon: string };

/**
 * Barra inferior tipo app, reutilizable en las apps de operario (bodega,
 * producción, etc.). Reparte el ancho en partes iguales (no se aprieta en
 * celulares angostos), marca la pestaña activa y respeta el área segura del
 * iPhone. El color de acento lo pone cada app.
 */
export default function BottomNav({ items, acento = "#0f766e" }: { items: NavItem[]; acento?: string }) {
  const pathname = usePathname();
  // Coincidencia exacta para el inicio; por prefijo para las subsecciones.
  const activoHref = items.reduce<string | null>((mejor, it) => {
    const coincide = pathname === it.href || pathname.startsWith(it.href + "/");
    if (!coincide) return mejor;
    // Se queda con la ruta más específica (más larga) que coincide.
    if (!mejor || it.href.length > mejor.length) return it.href;
    return mejor;
  }, null);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-md items-stretch justify-around border-t border-slate-200 bg-white pb-[max(0.25rem,env(safe-area-inset-bottom))] text-[11px]">
      {items.map((it) => {
        const activo = it.href === activoHref;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={activo ? "page" : undefined}
            className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 pt-2 pb-1 font-semibold transition active:scale-95 ${activo ? "" : "text-slate-500"}`}
            style={activo ? { color: acento } : undefined}
          >
            <span className={`text-xl leading-none ${activo ? "" : "opacity-70"}`}>{it.icon}</span>
            <span className="w-full truncate px-0.5 text-center">{it.label}</span>
            <span className="mt-0.5 h-0.5 w-7 rounded-full" style={{ background: activo ? acento : "transparent" }} />
          </Link>
        );
      })}
    </nav>
  );
}
