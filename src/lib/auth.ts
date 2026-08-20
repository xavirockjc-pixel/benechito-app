import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE = "benechito_session";
const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "benechito-dev-secret-cambiar"
);

export type SesionUsuario = {
  sub: string;
  email: string;
  nombre: string;
  rol: string;
};

/** Firma un token de sesión (válido 7 días). */
export async function firmarSesion(payload: SesionUsuario) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/** Verifica un token; devuelve el payload o null. Sirve en edge (middleware). */
export async function verificarSesion(
  token?: string
): Promise<SesionUsuario | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SesionUsuario;
  } catch {
    return null;
  }
}

/** Guarda la cookie de sesión (httpOnly). */
export async function crearCookieSesion(token: string) {
  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/** Borra la cookie de sesión. */
export async function borrarCookieSesion() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Devuelve el usuario logueado (o null) leyendo la cookie. */
export async function usuarioActual(): Promise<SesionUsuario | null> {
  const store = await cookies();
  return verificarSesion(store.get(COOKIE)?.value);
}

export const NOMBRE_COOKIE = COOKIE;
