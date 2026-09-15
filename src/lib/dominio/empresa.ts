import { prisma } from "@/lib/prisma";
import { rubroDe, type Rubro } from "./rubros";

/**
 * Devuelve la empresa (singleton). La crea si no existe, para que el sistema
 * siempre tenga una configuración de rubro con la que trabajar.
 */
export async function empresaActual() {
  const e = await prisma.empresa.findFirst();
  if (e) return e;
  return prisma.empresa.create({ data: { nombre: "Mi negocio", rubro: "fabrica" } });
}

/**
 * Inicio del "día / cómputo" actual para los conteos del día. Es `periodoDesde`
 * si el admin/bodeguero apretó "Empezar nuevo día"; si no, la medianoche de hoy.
 * Lo anterior a esta fecha queda fuera del conteo del día (pero sigue en la base).
 */
export async function inicioDelDia(): Promise<Date> {
  const e = await prisma.empresa.findFirst({ select: { periodoDesde: true } });
  if (e?.periodoDesde) return new Date(e.periodoDesde);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
}

/** Rubro activo (con sus etiquetas y módulos ocultos). */
export async function rubroActivo(): Promise<Rubro> {
  const e = await empresaActual();
  return rubroDe(e.rubro);
}
