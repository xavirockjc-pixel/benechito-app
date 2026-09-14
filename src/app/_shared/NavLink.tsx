"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Enlace de pestaña que se resalta cuando estás en esa sección. Para tiras de
 * navegación (p. ej. la barra superior de Caja). `exact` para la raíz de la
 * sección, así no queda marcada en las subpáginas.
 */
export default function NavLink({
  href, acento = "#0f7a44", exact = false, children,
}: {
  href: string; acento?: string; exact?: boolean; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activo = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={activo ? "page" : undefined}
      className="shrink-0 rounded-lg px-3 py-2 font-bold text-slate-700 transition active:scale-95"
      style={activo ? { background: `color-mix(in srgb, ${acento} 14%, transparent)`, color: acento } : undefined}
    >
      {children}
    </Link>
  );
}
