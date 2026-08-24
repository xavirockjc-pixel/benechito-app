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

/** Rubro activo (con sus etiquetas y módulos ocultos). */
export async function rubroActivo(): Promise<Rubro> {
  const e = await empresaActual();
  return rubroDe(e.rubro);
}
