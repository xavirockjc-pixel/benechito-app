import type { Metadata, Viewport } from "next";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { ROLES_FULL } from "@/lib/dominio/permisos";
import { dentroDeHorario, horaChile, hayPermisoExtra, diaPermitido, diasLabel } from "@/lib/dominio/horario";
import { rubroActivo } from "@/lib/dominio/empresa";
import { logout } from "./actions";
import PedirAccesoBtn from "./PedirAccesoBtn";
import AvisoPedidos from "./AvisoPedidos";
import AvisoAperturas from "./AvisoAperturas";
import NotaRapida from "@/components/NotaRapida";
import NavLink from "@/app/_shared/NavLink";
import MicDictado from "@/components/MicDictado";

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
  const emp = await prisma.empresa.findFirst({ select: { accesoDesde: true, accesoHasta: true, accesoDias: true, accesoRoles: true, accesoExtraHasta: true, accesoExtraRoles: true } });
  const rol = usuario?.rol ?? "";
  const rolesConHorario = (emp?.accesoRoles ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const aplicaHorario = rolesConHorario.includes(rol) && !ROLES_FULL.includes(rol);
  const permisoExtra = hayPermisoExtra(rol, emp?.accesoExtraHasta, emp?.accesoExtraRoles);
  const permitidoHoy = diaPermitido(emp?.accesoDias);
  if (aplicaHorario && (!dentroDeHorario(emp?.accesoDesde, emp?.accesoHasta) || !permitidoHoy) && !permisoExtra) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 p-6 text-center text-white">
        <span className="text-6xl">🔒</span>
        <h1 className="font-display text-2xl font-extrabold">Fuera de horario</h1>
        <p className="max-w-xs text-sm text-slate-300">
          El acceso al local está habilitado <b>{diasLabel(emp?.accesoDias)}</b> de <b>{emp?.accesoDesde}</b> a <b>{emp?.accesoHasta}</b>.
          <br />Ahora son las <b>{horaChile().hhmm}</b>.
        </p>
        <PedirAccesoBtn />
        <form action={logout}>
          <button className="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-bold text-white active:brightness-110">Cerrar sesión</button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-3xl flex-col overflow-x-hidden bg-slate-50">
      <NotaRapida area="caja" autor={usuario?.nombre ?? ""} />
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#0f7a44] px-4 py-3 text-white shadow">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/20 text-sm font-extrabold">B</span>
          <span className="truncate font-display text-base font-extrabold">
            Benechito <span className="font-normal text-white/80">· {rubro.labels.caja}</span>
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-3">
          {/* Voz global: enfoca un campo y dicta para llenarlo por voz. */}
          <MicDictado etiqueta="🎤" />
          <span className="hidden text-xs text-white/80 sm:inline">{usuario?.nombre}</span>
          <form action={logout}><button className="text-xs font-semibold text-white/80">Salir</button></form>
        </span>
      </header>
      <nav className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2 text-sm">
        <NavLink href="/caja" exact>🛒 Caja</NavLink>
        <AvisoPedidos />
        <NavLink href="/caja/vecina">🏧 Caja Vecina</NavLink>
        <NavLink href="/caja/inventario">🍫 Productos</NavLink>
        <NavLink href="/caja/sabores">🍧 Sabores</NavLink>
        <NavLink href="/caja/checklist">🌡️ Higiene</NavLink>
      </nav>
      <AvisoAperturas />
      <main className="flex-1 p-4">{children}</main>
    </div>
  );
}
