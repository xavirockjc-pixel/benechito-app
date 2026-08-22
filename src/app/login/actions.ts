"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { firmarSesion, crearCookieSesion } from "@/lib/auth";
import { homeDe } from "@/lib/dominio/permisos";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) {
    return { error: "Ingresa tu email y contraseña." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
    return { error: "Email o contraseña incorrectos." };
  }

  const token = await firmarSesion({
    sub: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol,
  });
  await crearCookieSesion(token);

  // Destino: respeta `next` si es una zona válida; si no, la "casa" del rol.
  const zonaValida =
    next.startsWith("/admin") || next.startsWith("/vendedor") || next.startsWith("/caja") ||
    next.startsWith("/bodega") || next.startsWith("/produccion");
  redirect(zonaValida ? next : homeDe(usuario.rol));
}
