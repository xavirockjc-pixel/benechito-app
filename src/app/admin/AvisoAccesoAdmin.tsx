import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { dentroDeHorario, horaChile, minutosHastaCierre, hayPermisoExtra } from "@/lib/dominio/horario";

const ROL_LABEL: Record<string, string> = { caja: "Local", bodega: "Bodega", produccion: "Producción", vendedor: "Reparto" };
const hhmm = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { timeZone: "America/Santiago", hour: "2-digit", minute: "2-digit" });

/**
 * Aviso SOLO para el administrador: dice cómo está el acceso de los trabajadores
 * (cierra pronto / fuera de horario / permiso vigente) y enlaza a autorizar.
 */
export default async function AvisoAccesoAdmin() {
  const emp = await prisma.empresa.findFirst({ select: { accesoDesde: true, accesoHasta: true, accesoRoles: true, accesoExtraHasta: true, accesoExtraRoles: true } });
  const roles = (emp?.accesoRoles ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (roles.length === 0 || !emp?.accesoHasta) return null;

  const dentro = dentroDeHorario(emp.accesoDesde, emp.accesoHasta);
  const faltan = minutosHastaCierre(emp.accesoHasta);
  const permisoVigente = emp.accesoExtraHasta && new Date() < new Date(emp.accesoExtraHasta);
  const rolesTxt = roles.map((r) => ROL_LABEL[r] ?? r).join(", ");

  // Solo mostramos algo si es relevante: cierra pronto, está cerrado, o hay permiso.
  const cierraPronto = dentro && faltan != null && faltan <= 45;
  if (!cierraPronto && dentro && !permisoVigente) return null;

  let tono = "border-amber-300 bg-amber-50 text-amber-800";
  let texto = "";
  if (permisoVigente) {
    const permRoles = (emp.accesoExtraRoles ?? "").split(",").map((r) => ROL_LABEL[r.trim()] ?? r.trim()).join(", ");
    tono = "border-sky-300 bg-sky-50 text-sky-800";
    texto = `🔓 Permiso de acceso activo para ${permRoles} hasta las ${hhmm(emp.accesoExtraHasta!)}.`;
  } else if (cierraPronto) {
    texto = `⏰ ${rolesTxt} cierra${roles.length > 1 ? "n" : ""} en ${faltan} min (${emp.accesoHasta}). Son las ${horaChile().hhmm}.`;
  } else {
    tono = "border-slate-300 bg-slate-100 text-slate-700";
    texto = `🔒 Fuera de horario: ${rolesTxt} no puede${roles.length > 1 ? "n" : ""} entrar (horario ${emp.accesoDesde}–${emp.accesoHasta}). Son las ${horaChile().hhmm}.`;
  }

  return (
    <div className={`mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold ${tono}`}>
      <span>{texto}</span>
      <Link href="/admin/configuracion#acceso" className="shrink-0 rounded-lg bg-white/70 px-3 py-1 text-xs font-extrabold text-slate-700 ring-1 ring-black/5 hover:bg-white">
        {permisoVigente ? "Ver / revocar" : "Autorizar acceso"}
      </Link>
    </div>
  );
}
