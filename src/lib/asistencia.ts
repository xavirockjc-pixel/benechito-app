import "server-only";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Marca (idempotente) que un usuario TRABAJÓ hoy, si tiene un trabajador enlazado.
 * Se llama cuando alguien hace actividad real (vende en terreno, registra producción):
 * su asistencia queda sola en el calendario del equipo y alimenta su pago.
 */
export async function marcarAsistenciaAuto(usuarioId: string | null | undefined, notas = "Actividad registrada") {
  if (!usuarioId) return;
  const trab = await prisma.trabajador.findFirst({ where: { usuarioId, activo: true }, select: { id: true } });
  if (!trab) return;

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);

  const yaMarcada = await prisma.asistencia.findFirst({
    where: { trabajadorId: trab.id, fecha: { gte: hoy, lt: manana } },
    select: { id: true },
  });
  if (yaMarcada) return; // ya tiene asistencia hoy, no duplicar

  await prisma.asistencia.create({
    data: { trabajadorId: trab.id, fecha: new Date(), presente: true, tipo: "trabajo", horas: 0, notas },
  });
  revalidatePath(`/admin/equipo/${trab.id}`);
  revalidatePath("/admin/sueldos");
}
