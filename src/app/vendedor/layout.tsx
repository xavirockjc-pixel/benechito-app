import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { usuarioActual } from "@/lib/auth";
import { rubroActivo } from "@/lib/dominio/empresa";
import { logout } from "./actions";
import RegistrarSW from "./RegistrarSW";
import NotaRapida from "@/components/NotaRapida";
import BottomNav from "@/app/_shared/BottomNav";

export const metadata: Metadata = {
  title: "Benechito Vendedor",
  manifest: "/vendedor.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Vendedor" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1479c4" };

export default async function VendedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await usuarioActual();
  const rubro = await rubroActivo();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50">
      <RegistrarSW />
      <NotaRapida area="ventas" autor={usuario?.nombre ?? ""} />

      {/* Barra superior */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#1479c4] px-4 py-3 text-white shadow">
        <Link href="/vendedor" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-sm font-extrabold">B</span>
          <span className="font-display text-base font-extrabold leading-tight">
            Benechito <span className="font-normal text-white/80">{rubro.labels.vendedor}</span>
          </span>
        </Link>
        <form action={logout}>
          <button className="text-xs font-semibold text-white/80">Salir</button>
        </form>
      </header>

      <main className="flex-1 p-4 pb-24">{children}</main>

      {/* Barra inferior (navegación) */}
      <BottomNav
        acento="#1479c4"
        items={[
          { href: "/vendedor", label: "Inicio", icon: "🏠" },
          { href: "/vendedor/entregas", label: "Entregas", icon: "🛵" },
          { href: "/vendedor/agenda", label: "Agenda", icon: "📅" },
          { href: "/vendedor/ruta", label: "Ruta", icon: "🗺️" },
          { href: "/vendedor/camion", label: "Camión", icon: "📦" },
          { href: "/vendedor/vehiculo", label: "Vehículo", icon: "🚙" },
          { href: "/vendedor/nuevo", label: "Nuevo", icon: "➕" },
        ]}
      />
    </div>
  );
}
