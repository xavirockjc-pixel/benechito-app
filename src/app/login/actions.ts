"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { firmarSesion, crearCookieSesion } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/panel");

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

  redirect(next.startsWith("/panel") ? next : "/panel");
}
