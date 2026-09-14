import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { usuarioActual } from "@/lib/auth";
import { rubroActivo } from "@/lib/dominio/empresa";
import { logout } from "./actions";
import NotaRapida from "@/components/NotaRapida";
import BottomNav from "@/app/_shared/BottomNav";

export const metadata: Metadata = {
  title: "Benechito Bodega",
  manifest: "/bodega.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Bodega" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#b45309" };

export default async function BodegaLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  const rubro = await rubroActivo();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50">
      <NotaRapida area="inventario" autor={usuario?.nombre ?? ""} />
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#b45309] px-4 py-3 text-white shadow">
        <Link href="/bodega" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-sm font-extrabold">B</span>
          <span className="font-display text-base font-extrabold leading-tight">
            Benechito <span className="font-normal text-white/80">{rubro.labels.bodega}</span>
          </span>
        </Link>
        <span className="flex items-center gap-3">
          <span className="hidden text-xs text-white/80 sm:inline">{usuario?.nombre}</span>
          <form action={logout}><button className="text-xs font-semibold text-white/80">Salir</button></form>
        </span>
      </header>
      <main className="flex-1 p-4 pb-24">{children}</main>

      {/* Barra inferior (navegación) */}
      <BottomNav
        acento="#b45309"
        items={[
          { href: "/bodega", label: rubro.labels.bodega, icon: "📦" },
          { href: "/bodega/surtidos", label: rubro.labels.surtidos, icon: "🍬" },
          { href: "/bodega/insumos", label: "Insumos", icon: "🧪" },
          { href: "/bodega/checklist", label: "Higiene", icon: "🧼" },
        ]}
      />
    </div>
  );
}
