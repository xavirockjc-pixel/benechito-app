import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { usuarioActual } from "@/lib/auth";
import { logout } from "./actions";
import RegistrarSW from "./RegistrarSW";

export const metadata: Metadata = {
  title: "Benechito Vendedor",
  manifest: "/vendedor.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Vendedor" },
};

export const viewport: Viewport = { themeColor: "#1479c4" };

export default async function VendedorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await usuarioActual();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-slate-50">
      <RegistrarSW />

      {/* Barra superior */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#1479c4] px-4 py-3 text-white shadow">
        <Link href="/vendedor" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-sm font-extrabold">B</span>
          <span className="font-display text-base font-extrabold leading-tight">
            Benechito <span className="font-normal text-white/80">Vendedor</span>
          </span>
        </Link>
        <form action={logout}>
          <button className="text-xs font-semibold text-white/80">Salir</button>
        </form>
      </header>

      <main className="flex-1 p-4 pb-24">{children}</main>

      {/* Barra inferior (navegación) */}
      <nav className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md items-center justify-around border-t border-slate-200 bg-white px-2 py-2 text-xs">
        <Link href="/vendedor" className="flex flex-col items-center gap-0.5 px-4 py-1 font-semibold text-slate-700">
          <span className="text-lg">🏪</span> Clientes
        </Link>
        <Link href="/vendedor/nuevo" className="flex flex-col items-center gap-0.5 px-4 py-1 font-semibold text-slate-700">
          <span className="text-lg">➕</span> Nuevo
        </Link>
        <span className="flex flex-col items-center gap-0.5 px-4 py-1 font-semibold text-slate-300">
          <span className="text-lg">🚚</span> Ruta
        </span>
        <span className="truncate px-2 text-right text-[10px] text-slate-400">{usuario?.nombre}</span>
      </nav>
    </div>
  );
}
