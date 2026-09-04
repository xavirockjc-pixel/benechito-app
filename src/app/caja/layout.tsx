import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { usuarioActual } from "@/lib/auth";
import { rubroActivo } from "@/lib/dominio/empresa";
import { logout } from "./actions";
import AvisoPedidos from "./AvisoPedidos";
import NotaRapida from "@/components/NotaRapida";

export const metadata: Metadata = {
  title: "Benechito Caja",
  manifest: "/caja.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Caja" },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f7a44" };

export default async function CajaLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();
  const rubro = await rubroActivo();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col bg-slate-50">
      <NotaRapida area="caja" autor={usuario?.nombre ?? ""} />
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#0f7a44] px-4 py-3 text-white shadow">
        <span className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-sm font-extrabold">B</span>
          <span className="font-display text-base font-extrabold">
            Benechito <span className="font-normal text-white/80">· {rubro.labels.caja}</span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden text-xs text-white/80 sm:inline">{usuario?.nombre}</span>
          <form action={logout}><button className="text-xs font-semibold text-white/80">Salir</button></form>
        </span>
      </header>
      <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 text-sm">
        <Link href="/caja" className="shrink-0 rounded-lg px-3 py-1.5 font-bold text-slate-700">🛒 Caja</Link>
        <AvisoPedidos />
        <Link href="/caja/inventario" className="shrink-0 rounded-lg px-3 py-1.5 font-bold text-slate-700">🍫 Productos</Link>
        <Link href="/caja/sabores" className="shrink-0 rounded-lg px-3 py-1.5 font-bold text-slate-700">🍧 Sabores</Link>
        <Link href="/caja/checklist" className="shrink-0 rounded-lg px-3 py-1.5 font-bold text-slate-700">🌡️ Higiene</Link>
      </nav>
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
