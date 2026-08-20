import Link from "next/link";
import { usuarioActual } from "@/lib/auth";
import { logout } from "./actions";

const nav = [
  { href: "/panel", label: "Dashboard", icon: "📊" },
  { href: "/panel/negocios", label: "Negocios", icon: "🏪" },
  { href: "/panel/reposiciones", label: "Reposiciones", icon: "🔄" },
  { href: "/panel/productos", label: "Productos", icon: "🍫" },
];

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await usuarioActual();

  return (
    <div className="flex min-h-screen bg-crema">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between bg-navy p-5 text-crema md:flex">
        <div>
          <div className="mb-8">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-naranja text-lg font-extrabold text-white">
              B
            </span>
            <p className="mt-2 font-display text-lg font-extrabold text-white">
              Benechito
            </p>
            <p className="script text-sm text-dorado-2">Panel interno</p>
          </div>
          <nav className="space-y-1">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-crema/80 transition hover:bg-white/10 hover:text-white"
              >
                <span>{n.icon}</span> {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="border-t border-white/10 pt-4">
          <p className="text-sm font-bold text-white">{usuario?.nombre}</p>
          <p className="mb-3 truncate text-xs text-crema/60">{usuario?.email}</p>
          <form action={logout}>
            <button className="w-full rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-crema/90 transition hover:bg-white/20">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1">
        {/* Barra móvil */}
        <div className="flex items-center justify-between border-b border-crema-2 bg-navy px-4 py-3 text-white md:hidden">
          <span className="font-display font-extrabold">Benechito · Panel</span>
          <form action={logout}>
            <button className="text-sm font-semibold text-crema/80">Salir</button>
          </form>
        </div>
        {/* Nav móvil */}
        <nav className="flex gap-1 overflow-x-auto border-b border-crema-2 bg-white px-2 py-2 md:hidden">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-navy"
            >
              {n.icon} {n.label}
            </Link>
          ))}
        </nav>

        <main className="mx-auto max-w-5xl p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
