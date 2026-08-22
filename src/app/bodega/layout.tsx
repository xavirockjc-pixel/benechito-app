import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { usuarioActual } from "@/lib/auth";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "Benechito Bodega",
  manifest: "/bodega.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Bodega" },
};
export const viewport: Viewport = { themeColor: "#b45309" };

export default async function BodegaLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#b45309] px-4 py-3 text-white shadow">
        <Link href="/bodega" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-sm font-extrabold">B</span>
          <span className="font-display text-base font-extrabold leading-tight">
            Benechito <span className="font-normal text-white/80">Bodega</span>
          </span>
        </Link>
        <span className="flex items-center gap-3">
          <span className="hidden text-xs text-white/80 sm:inline">{usuario?.nombre}</span>
          <form action={logout}><button className="text-xs font-semibold text-white/80">Salir</button></form>
        </span>
      </header>
      <main className="flex-1 p-4 pb-24">{children}</main>

      {/* Barra inferior (navegación) */}
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md items-center justify-around border-t border-slate-200 bg-white px-2 py-2 text-xs">
        <Link href="/bodega" className="flex flex-col items-center gap-0.5 px-6 py-1 font-semibold text-slate-700">
          <span className="text-lg">📦</span> Bodega
        </Link>
        <Link href="/bodega/surtidos" className="flex flex-col items-center gap-0.5 px-6 py-1 font-semibold text-slate-700">
          <span className="text-lg">🍬</span> Surtidos
        </Link>
      </nav>
    </div>
  );
}
