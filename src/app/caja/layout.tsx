import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { ROLES_FULL } from "@/lib/dominio/permisos";
import { dentroDeHorario, horaChile } from "@/lib/dominio/horario";
import { rubroActivo } from "@/lib/dominio/empresa";
import { logout } from "./actions";
import AvisoPedidos from "./AvisoPedidos";
import AvisoAperturas from "./AvisoAperturas";
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

  // Horario de acceso: si el rol tiene horario y está fuera de la ventana, se bloquea.
  const emp = await prisma.empresa.findFirst({ select: { accesoDesde: true, accesoHasta: true, accesoRoles: true } });
  const rol = usuario?.rol ?? "";
  const rolesConHorario = (emp?.accesoRoles ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const aplicaHorario = rolesConHorario.includes(rol) && !ROLES_FULL.includes(rol);
  if (aplicaHorario && !dentroDeHorario(emp?.accesoDesde, emp?.accesoHasta)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center text-white">
        <span className="text-6xl">🔒</span>
        <h1 className="font-display text-2xl font-extrabold">Fuera de horario</h1>
        <p className="max-w-xs text-sm text-slate-300">
          El acceso al local está habilitado de <b>{emp?.accesoDesde}</b> a <b>{emp?.accesoHasta}</b>.
          <br />Ahora son las <b>{horaChile().hhmm}</b>.
        </p>
        <form action={logout}>
          <button className="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-bold text-white active:brightness-110">Cerrar sesión</button>
        </form>
      </div>
    );
  }

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
        <Link href="/caja/vecina" className="shrink-0 rounded-lg px-3 py-1.5 font-bold text-slate-700">🏧 Caja Vecina</Link>
        <Link href="/caja/inventario" className="shrink-0 rounded-lg px-3 py-1.5 font-bold text-slate-700">🍫 Productos</Link>
        <Link href="/caja/sabores" className="shrink-0 rounded-lg px-3 py-1.5 font-bold text-slate-700">🍧 Sabores</Link>
        <Link href="/caja/checklist" className="shrink-0 rounded-lg px-3 py-1.5 font-bold text-slate-700">🌡️ Higiene</Link>
      </nav>
      <AvisoAperturas />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
