"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { esRol, ROLES_ADMIN } from "@/lib/dominio/usuarios";

/** Solo propietario/admin pueden administrar usuarios. Devuelve el usuario actual o null. */
async function soloAdmin() {
  const u = await usuarioActual();
  if (!u) return null;
  const yo = await prisma.usuario.findUnique({ where: { id: u.sub }, select: { id: true, rol: true } });
  if (!yo || !ROLES_ADMIN.includes(yo.rol)) return null;
  return yo;
}

const val = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Crea un usuario del equipo. */
export async function crearUsuario(formData: FormData) {
  if (!(await soloAdmin())) return;

  const email = val(formData, "email").toLowerCase();
  const nombre = val(formData, "nombre");
  const rol = val(formData, "rol");
  const password = val(formData, "password");
  if (!email || !nombre || !esRol(rol) || password.length < 6) return;

  const existe = await prisma.usuario.findUnique({ where: { email } });
  if (existe) return;

  await prisma.usuario.create({
    data: { email, nombre, rol, passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/admin/usuarios");
}

export type CambioPassState = { ok: boolean; msg: string } | null;

/** Cambia la contraseña de un usuario. Devuelve estado para mostrar confirmación. */
export async function cambiarPassword(_prev: CambioPassState, formData: FormData): Promise<CambioPassState> {
  if (!(await soloAdmin())) return { ok: false, msg: "Sin permiso para cambiar contraseñas." };

  const id = val(formData, "id");
  const password = val(formData, "password");
  if (!id) return { ok: false, msg: "Falta el usuario." };
  if (password.length < 6) return { ok: false, msg: "La contraseña debe tener al menos 6 caracteres." };

  await prisma.usuario.update({ where: { id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  revalidatePath("/admin/usuarios");
  return { ok: true, msg: "✓ Contraseña actualizada" };
}

/** Actualiza nombre, rol y estado (activo) de un usuario. */
export async function actualizarUsuario(formData: FormData) {
  if (!(await soloAdmin())) return;

  const id = val(formData, "id");
  const nombre = val(formData, "nombre");
  const rol = val(formData, "rol");
  if (!id || !nombre || !esRol(rol)) return;

  await prisma.usuario.update({
    where: { id },
    data: { nombre, rol, activo: formData.get("activo") === "si" },
  });
  revalidatePath("/admin/usuarios");
}

/** Elimina un usuario. No puedes eliminarte a ti mismo ni al último administrador. */
export async function eliminarUsuario(formData: FormData) {
  const yo = await soloAdmin();
  if (!yo) return;

  const id = val(formData, "id");
  if (!id || id === yo.id) return; // no borrarte a ti mismo

  const objetivo = await prisma.usuario.findUnique({ where: { id }, select: { rol: true } });
  if (objetivo && ROLES_ADMIN.includes(objetivo.rol)) {
    const admins = await prisma.usuario.count({ where: { rol: { in: ROLES_ADMIN } } });
    if (admins <= 1) return; // no borrar el último admin
  }

  await prisma.usuario.delete({ where: { id } });
  revalidatePath("/admin/usuarios");
}
