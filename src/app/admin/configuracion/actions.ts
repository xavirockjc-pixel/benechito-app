"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { RUBROS, type RubroId } from "@/lib/dominio/rubros";
import { empresaActual } from "@/lib/dominio/empresa";
import { precargarRubro } from "@/lib/dominio/seed-rubro";

/**
 * Actualiza la configuración del negocio (Empresa): su nombre y su RUBRO.
 * El rubro cambia —con el mismo motor— los nombres de las áreas, los colores y
 * qué módulos se ven u ocultan. Es la pieza clave del modelo "un motor, muchas colmenas".
 */
export async function actualizarEmpresa(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const rubro = String(formData.get("rubro") ?? "").trim();
  const empresa = await empresaActual();

  const data: { nombre?: string; rubro?: string } = {};
  if (nombre) data.nombre = nombre;
  if (rubro && rubro in RUBROS) data.rubro = rubro as RubroId;
  if (Object.keys(data).length === 0) return;

  await prisma.empresa.update({ where: { id: empresa.id }, data });

  // El rubro afecta menú, etiquetas y tema → revalidar todo el panel.
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/configuracion");
}

/** Cambia el menú entre modo simple (solo núcleo) y completo (con Extras / En revisión). */
export async function cambiarModoMenu(formData: FormData) {
  const empresa = await empresaActual();
  const simple = String(formData.get("modo") ?? "simple") !== "completo";
  await prisma.empresa.update({ where: { id: empresa.id }, data: { modoSimple: simple } });
  revalidatePath("/admin", "layout");
  redirect("/admin/configuracion?menu=ok");
}

/** Guarda el horario de acceso de los trabajadores (no aplica a propietario/admin). */
export async function actualizarHorarioAcceso(formData: FormData) {
  const empresa = await empresaActual();
  const hhmm = (v: string) => (/^\d{1,2}:\d{2}$/.test(v) ? v : null);
  const desde = hhmm(String(formData.get("accesoDesde") ?? "").trim());
  const hasta = hhmm(String(formData.get("accesoHasta") ?? "").trim());
  const roles = formData.getAll("accesoRoles").map((r) => String(r)).filter(Boolean).join(",");

  await prisma.empresa.update({
    where: { id: empresa.id },
    data: { accesoDesde: desde, accesoHasta: hasta, accesoRoles: roles },
  });
  revalidatePath("/admin/configuracion");
  redirect("/admin/configuracion?horario=ok");
}

/** Autoriza acceso fuera de horario por N minutos a los roles indicados. */
export async function autorizarAccesoExtra(formData: FormData) {
  const empresa = await empresaActual();
  const minutos = Math.max(5, Math.min(600, parseInt(String(formData.get("minutos") ?? "60"), 10) || 60));
  const roles = formData.getAll("roles").map((r) => String(r)).filter(Boolean);
  const rolesCsv = roles.length ? roles.join(",") : (empresa.accesoRoles ?? "caja");
  const hasta = new Date(Date.now() + minutos * 60000);

  await prisma.empresa.update({
    where: { id: empresa.id },
    data: { accesoExtraHasta: hasta, accesoExtraRoles: rolesCsv },
  });
  // Da por atendidas las solicitudes pendientes de esos roles.
  await prisma.solicitudAcceso.updateMany({
    where: { estado: "pendiente", rol: { in: rolesCsv.split(",").map((s) => s.trim()) } },
    data: { estado: "atendida" },
  });
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin");
  redirect("/admin/configuracion?permiso=ok");
}

/** Revoca cualquier permiso de acceso extra vigente. */
export async function revocarAccesoExtra() {
  const empresa = await empresaActual();
  await prisma.empresa.update({ where: { id: empresa.id }, data: { accesoExtraHasta: null, accesoExtraRoles: null } });
  revalidatePath("/admin/configuracion");
  revalidatePath("/admin");
  redirect("/admin/configuracion?permiso=revocado");
}

/**
 * Precarga los datos base del rubro actual (sucursal, ubicaciones, listas de
 * precio y tipos/formatos). Idempotente: no duplica si ya existen.
 */
export async function precargarDatosRubro() {
  const empresa = await empresaActual();
  const rubro = (empresa.rubro in RUBROS ? empresa.rubro : "fabrica") as RubroId;
  await precargarRubro(empresa.id, rubro);
  revalidatePath("/admin", "layout");
  redirect("/admin/configuracion?seed=ok");
}
