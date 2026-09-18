import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { puedeAccederAdmin, ROLES_FULL } from "@/lib/dominio/permisos";
import { rubroActivo } from "@/lib/dominio/empresa";
import type { Etiquetas } from "@/lib/dominio/rubros";
import { logout } from "./actions";
import RegistrarSW from "./RegistrarSW";
import MenuMovil from "./MenuMovil";
import SidebarNav from "./SidebarNav";
import NotaRapida from "@/components/NotaRapida";
import BottomNav from "@/app/_shared/BottomNav";
import MicDictado from "@/components/MicDictado";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Panel Benechito",
  manifest: "/panel.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Panel Benechito" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1479c4" };

// Sistema de administración organizado por módulos (ver ARQUITECTURA-ECOSYSTEM.md).
// Identidad propia de "sistema operativo": tonos sobrios slate, distinta de la web pública.
type Item = { href: string; label: string; icon: string };
type Modulo = { titulo: string; activo: boolean; items: Item[] };

// El menú se construye con las etiquetas del rubro activo (plantilla).
function construirModulos(L: Etiquetas): Modulo[] {
  return [
    {
      titulo: "Inicio",
      activo: true,
      items: [
        { href: "/admin", label: "Panel", icon: "📊" },
        { href: "/admin/panorama", label: "Panorama general", icon: "🌎" },
        { href: "/admin/socio", label: "Socio administrativo", icon: "🐝" },
        { href: "/admin/notas", label: "Notas y acciones", icon: "📝" },
        { href: "/admin/correcciones", label: "Correcciones (deshacer)", icon: "🧹" },
        { href: "/admin/recordatorios", label: "Recordatorios (clientes)", icon: "🔔" },
        { href: "/admin/agenda", label: "Agenda", icon: "📅" },
        { href: "/admin/mejoras", label: "Mejoras y proyecciones", icon: "🚀" },
        { href: "/admin/calculadora", label: "Calculadora (producto/proyecto)", icon: "🧮" },
        { href: "/admin/voz", label: "Asistente voz", icon: "🎙️" },
      ],
    },
    {
      // Todos los canales de venta juntos (evita saturar el menú).
      titulo: "Ventas y canales",
      activo: true,
      items: [
        { href: "/admin/pos", label: L.pos, icon: "🛒" },
        { href: "/admin/ventas", label: "Ventas", icon: "💵" },
        { href: "/admin/pedidos", label: "Pedidos", icon: "🧾" },
        { href: "/admin/repartos", label: "Vehículo y reparto", icon: "🚚" },
        { href: "/admin/repartidores", label: "Repartidores (mapa)", icon: "📍" },
      ],
    },
    {
      titulo: "Catálogo y clientes",
      activo: true,
      items: [
        { href: "/admin/negocios", label: "Clientes", icon: "🏪" },
        { href: "/admin/clientes-dashboard", label: "Dashboard clientes", icon: "📊" },
        { href: "/admin/productos", label: "Catálogo", icon: "🍫" },
        { href: "/admin/precios", label: "Precios", icon: "🏷️" },
        { href: "/admin/inventario", label: "Inventario", icon: "📦" },
      ],
    },
    {
      titulo: "Producción",
      activo: true,
      items: [
        { href: "/admin/produccion", label: L.produccion, icon: "🏭" },
        { href: "/admin/produccion-analisis", label: "Análisis de producción", icon: "📊" },
        { href: "/admin/materias", label: L.materias, icon: "🧪" },
        { href: "/admin/sabores", label: L.sabores, icon: "🍫" },
      ],
    },
    {
      titulo: "Finanzas",
      activo: true,
      items: [
        { href: "/admin/finanzas", label: "Finanzas", icon: "💰" },
        { href: "/admin/estado-financiero", label: "Estado financiero", icon: "📋" },
        { href: "/admin/cobranza", label: "Cobranza", icon: "💸" },
        { href: "/admin/balance-ruta", label: "Balance de reparto", icon: "🚚" },
        { href: "/admin/sueldos", label: "Pagos al equipo", icon: "💵" },
        { href: "/admin/cuadratura", label: "Cuadratura diaria", icon: "⚖️" },
        { href: "/admin/caja-vecina", label: "Caja Vecina (aparte)", icon: "🏧" },
      ],
    },
    {
      titulo: "Sistema",
      activo: true,
      items: [
        { href: "/admin/equipo", label: "Equipo", icon: "👥" },
        { href: "/admin/usuarios", label: "Usuarios", icon: "🔑" },
        { href: "/admin/configuracion", label: "Configuración", icon: "⚙️" },
      ],
    },
    {
      // Duplicados y módulos que quizá se implementen/ajusten a futuro. Vivos, para revisar.
      titulo: "🧪 Extras / En revisión",
      activo: true,
      items: [
        { href: "/admin/dashboard", label: "Tablero", icon: "📈" },
        { href: "/admin/supercerebro", label: "Supercerebro", icon: "🧠" },
        { href: "/admin/ventas-local", label: "Ventas Local (análisis)", icon: "🏪" },
        { href: "/admin/rentabilidad", label: "Rentabilidad", icon: "📊" },
        { href: "/admin/rutas", label: L.rutas, icon: "🗺️" },
        { href: "/admin/retiros", label: L.retiros, icon: "📥" },
        { href: "/admin/preventa", label: "Preventa", icon: "📲" },
        { href: "/admin/caja", label: "Cierres de caja", icon: "🧾" },
        { href: "/admin/puntos", label: "Puntos Benechito", icon: "⭐" },
        { href: "/admin/novedades", label: "Novedades & Promos", icon: "🔥" },
        { href: "/admin/negocios/duplicados", label: "Duplicados", icon: "🔁" },
        { href: "/admin/reposiciones", label: "Reposiciones", icon: "🔁" },
        { href: "/admin/control-calidad", label: "Control calidad y turnos", icon: "✅" },
        { href: "/admin/iva", label: "Ayudante de IVA", icon: "🧾" },
        { href: "/admin/facturacion", label: "Facturación", icon: "🧾" },
        { href: "/admin/formularios", label: "Checklists / BPM", icon: "✅" },
        { href: "/admin/capacitaciones", label: "Capacitaciones", icon: "🎓" },
        { href: "/admin/higiene", label: "Higiene y EPP", icon: "🧴" },
      ],
    },
  ];
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await usuarioActual();
  const rol = usuario?.rol ?? "";
  const esFull = ROLES_FULL.includes(rol);

  // Menú según la plantilla del rubro activo (renombra áreas y oculta módulos).
  const rubro = await rubroActivo();
  const empresa = await prisma.empresa.findFirst({ select: { modoSimple: true } });
  const modoSimple = empresa?.modoSimple ?? true;
  const modulos = construirModulos(rubro.labels);
  const ocultos = new Set(rubro.ocultar);
  const tema = rubro.tema;
  const gradMarca = `linear-gradient(135deg, ${tema.degradado[0]}, ${tema.degradado[1]})`;

  // Filtra el menú según el rol y el rubro. En modo simple se oculta el grupo "Extras / En revisión".
  const modulosVisibles = modulos
    .filter((m) => !(modoSimple && m.titulo.includes("Extras")))
    .map((m) => ({
      ...m,
      items: m.items.filter(
        (n) => n.href !== "#" && !ocultos.has(n.href) && (esFull || puedeAccederAdmin(rol, n.href)),
      ),
    }))
    .filter((m) => m.items.length > 0);

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-800">
      <RegistrarSW />
      <NotaRapida area="general" autor={usuario?.nombre ?? rol} />
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between bg-slate-900 p-5 text-slate-300 md:flex">
        <div>
          {/* Marca del sistema (con tema del rubro) */}
          <div className="mb-8 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl text-xl shadow" style={{ background: gradMarca }}>
              {rubro.emoji}
            </span>
            <div>
              <p className="font-display text-base font-extrabold leading-tight text-white">
                Benechito
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {rubro.nombre}
              </p>
            </div>
          </div>

          {/* Módulos (resalta la sección activa) */}
          <SidebarNav modulos={modulosVisibles} />
        </div>

        {/* Usuario */}
        <div className="border-t border-slate-800 pt-4">
          {/* Voz global: enfoca un campo y dicta. */}
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-slate-800 px-3 py-2">
            <span className="text-xs font-semibold text-slate-300">🎤 Dictar en un campo</span>
            <MicDictado etiqueta="🎤" />
          </div>
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
        <div className="flex items-center justify-between gap-2 bg-slate-900 px-4 py-3 text-white md:hidden">
          <MenuMovil modulos={modulosVisibles} />
          <span className="min-w-0 flex-1 truncate font-display text-sm font-extrabold">
            Benechito <span className="font-normal text-slate-400">· Administración</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {/* Voz global: enfoca un campo y dicta para llenarlo por voz. */}
            <MicDictado etiqueta="🎤" />
            <form action={logout}>
              <button className="text-sm font-semibold text-slate-300">Salir</button>
            </form>
          </span>
        </div>

        <main className="mx-auto max-w-5xl p-4 pb-24 md:p-8 md:pb-8">{children}</main>

        {/* Barra inferior tipo app (solo celular) para administrar rápido */}
        <BottomNav
          acento="#1479c4"
          desktopHidden
          items={[
            { href: "/admin", label: "Panel", icon: "📊", exact: true },
            { href: "/admin/pos", label: "Vender", icon: "🛒" },
            { href: "/admin/ventas", label: "Ventas", icon: "💵" },
            { href: "/admin/negocios", label: "Clientes", icon: "🏪" },
            { href: "/admin/inventario", label: "Stock", icon: "📦" },
          ]}
        />
      </div>
    </div>
  );
}
