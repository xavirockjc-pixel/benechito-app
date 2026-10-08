import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";

/**
 * Registra que alguien abrió una ventana/sección de una app (Socio Benechito,
 * Higiene, etc.). Queda en Auditoria (accion="entrar") para ver el historial de
 * movimiento en la central: quién entró, a qué y cuándo. Nunca rompe la pantalla.
 */
export async function registrarAcceso(app: string, seccion: string) {
  try {
    const u = await usuarioActual();
    await prisma.auditoria.create({
      data: {
        accion: "entrar",
        entidad: "acceso",
        entidadId: `${app}/${seccion}`,
        // Guardamos nombre/rol en el detalle (sin FK) para no depender del Usuario.
        detalle: JSON.stringify({ app, seccion, nombre: u?.nombre ?? "—", rol: u?.rol ?? "—" }),
      },
    });
  } catch {
    /* si Auditoria no está disponible, seguimos sin registrar */
  }
}

export type AccesoDetalle = { app: string; seccion: string; nombre: string; rol: string };

export function parseAcceso(detalle: string | null): AccesoDetalle {
  try {
    const d = JSON.parse(detalle ?? "{}");
    return { app: d.app ?? "—", seccion: d.seccion ?? "—", nombre: d.nombre ?? "—", rol: d.rol ?? "—" };
  } catch {
    return { app: "—", seccion: "—", nombre: "—", rol: "—" };
  }
}
