"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { reiniciarAreas, esAreaReinicio } from "@/lib/dominio/reinicio";

/**
 * Reinicia los números de las áreas marcadas. Pide confirmación escrita ("REINICIAR")
 * para evitar accidentes. Deja constancia en Auditoría. No toca la configuración.
 */
export async function reiniciar(formData: FormData) {
  const confirmar = String(formData.get("confirmar") ?? "").trim().toUpperCase();
  const areas = formData.getAll("areas").map((a) => String(a)).filter(esAreaReinicio);

  if (confirmar !== "REINICIAR" || areas.length === 0) {
    redirect("/admin/reiniciar?error=1");
  }

  await reiniciarAreas(new Set(areas));

  const u = await usuarioActual();
  await prisma.auditoria.create({
    data: { usuarioId: u?.sub ?? null, accion: "reinicio_numeros", entidad: "Sistema", detalle: JSON.stringify({ areas }) },
  });

  // Refresca todo lo que pudo cambiar.
  for (const p of ["/admin", "/admin/produccion-analisis", "/admin/inventario", "/admin/ventas", "/admin/finanzas", "/produccion", "/bodega", "/vendedor", "/caja"]) {
    revalidatePath(p);
  }
  redirect(`/admin/reiniciar?ok=${areas.length}`);
}
