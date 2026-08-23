import Link from "next/link";
import { usuarioActual } from "@/lib/auth";
import { puedeAccederAdmin, ROLES_FULL } from "@/lib/dominio/permisos";
import { logout } from "./actions";

// Sistema de administración organizado por módulos (ver ARQUITECTURA-ECOSYSTEM.md).
// Identidad propia de "sistema operativo": tonos sobrios slate, distinta de la web pública.
type Item = { href: string; label: string; icon: string };
type Modulo = { titulo: string; activo: boolean; items: Item[] };

const modulos: Modulo[] = [
  {
    titulo: "Comercial",
    activo: true,
    items: [
      { href: "/admin", label: "Panel", icon: "📊" },
      { href: "/admin/dashboard", label: "Tablero", icon: "📈" },
      { href: "/admin/agenda", label: "Agenda", icon: "📅" },
      { href: "/admin/pos", label: "Punto de venta", icon: "🛒" },
      { href: "/admin/negocios", label: "Clientes", icon: "🏪" },
      { href: "/admin/productos", label: "Catálogo", icon: "🍫" },
      { href: "/admin/precios", label: "Precios", icon: "🏷️" },
      { href: "/admin/pedidos", label: "Pedidos", icon: "🧾" },
      { href: "/admin/preventa", label: "Preventa", icon: "📲" },
      { href: "/admin/rutas", label: "Rutas", icon: "🗺️" },
      { href: "/admin/ventas", label: "Ventas", icon: "💵" },
      { href: "/admin/inventario", label: "Inventario", icon: "📦" },
      { href: "/admin/reposiciones", label: "Reposiciones", icon: "🔄" },
    ],
  },
  {
    titulo: "Gestión",
    activo: true,
    items: [
      { href: "/admin/produccion", label: "Producción", icon: "🏭" },
      { href: "/admin/sabores", label: "Sabores", icon: "🍫" },
    ],
  },
  {
    titulo: "Finanzas",
    activo: true,
    items: [
      { href: "/admin/finanzas", label: "Finanzas", icon: "💰" },
    ],
  },
  {
    titulo: "Técnico",
    activo: false,
    items: [
      { href: "#", label: "Activos", icon: "🛠️" },
      { href: "#", label: "Mantención", icon: "🔧" },
    ],
  },
  {
    titulo: "Sistema",
    activo: true,
    items: [
      { href: "/admin/usuarios", label: "Usuarios", icon: "👥" },
    ],
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await usuarioActual();
  const rol = usuario?.rol ?? "";
  const esFull = ROLES_FULL.includes(rol);

  // Filtra el menú según el rol: los roles acotados solo ven lo suyo.
  const modulosVisibles = modulos
    .map((m) => ({
      ...m,
      items: esFull ? m.items : m.items.filter((n) => n.href !== "#" && puedeAccederAdmin(rol, n.href)),
    }))
    .filter((m) => esFull || m.items.length > 0);
  const itemsMovilVisibles = modulosVisibles.filter((m) => m.activo).flatMap((m) => m.items);

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-slate-900 p-5 text-slate-300 md:flex">
        <div>
          {/* Marca del sistema */}
          <div className="mb-8 flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-naranja to-dorado text-lg font-extrabold text-white shadow">
              B
            </span>
            <div>
              <p className="font-display text-base font-extrabold leading-tight text-white">
                Benechito
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Administración
              </p>
            </div>
          </div>

          {/* Módulos */}
          <nav className="space-y-6">
            {modulosVisibles.map((m) => (
              <div key={m.titulo}>
                <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {m.titulo}
                  {!m.activo && (
                    <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400">
                      pronto
                    </span>
                  )}
                </p>
                <div className="space-y-0.5">
                  {m.items.map((n) =>
                    m.activo ? (
                      <Link
                        key={n.label}
                        href={n.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                      >
                        <span>{n.icon}</span> {n.label}
                      </Link>
                    ) : (
                      <span
                        key={n.label}
                        className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600"
                      >
                        <span className="opacity-50">{n.icon}</span> {n.label}
                      </span>
                    ),
                  )}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Usuario */}
        <div className="border-t border-slate-800 pt-4">
          <Link
            href="/vendedor"
            className="mb-3 flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            📱 App Vendedor
          </Link>
          <p className="text-sm font-bold text-white">{usuario?.nombre}</p>
          <p className="mb-3 truncate text-xs text-slate-500">{usuario?.email}</p>
          <form action={logout}>
            <button className="w-full rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700">
              Cerrar sesión
            </button>
          </form>
        </div>
      </aside>

      {/* Contenido */}
      <div className="flex-1">
        {/* Barra móvil */}
        <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white md:hidden">
          <span className="font-display text-sm font-extrabold">
            Benechito <span className="font-normal text-slate-400">· Administración</span>
          </span>
          <form action={logout}>
            <button className="text-sm font-semibold text-slate-300">Salir</button>
          </form>
        </div>
        {/* Nav móvil */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-2 py-2 md:hidden">
          {itemsMovilVisibles.map((n) => (
            <Link
              key={n.label}
              href={n.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-700"
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
