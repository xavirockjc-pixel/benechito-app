import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { puedeAccederAdmin, homeDe, ROLES_CAJA, ROLES_BODEGA, ROLES_FULL } from "@/lib/dominio/permisos";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "benechito-dev-secret-cambiar"
);

/**
 * Protege /admin/* y /vendedor/*: si no hay sesión válida, redirige a /login.
 * Separa por rol: los de terreno (vendedor/chofer) quedan en su app; y dentro
 * del panel cada rol solo entra a lo que le corresponde.
 */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get("benechito_session")?.value;
  let rol: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, secret);
      rol = typeof payload.rol === "string" ? payload.rol : "";
    } catch {
      rol = null;
    }
  }

  // Sin sesión válida → login.
  if (rol === null) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  const path = req.nextUrl.pathname;
  const casa = homeDe(rol);

  if (path.startsWith("/admin")) {
    // Quien no es de administración → a su app (vendedor / caja).
    if (casa !== "/admin") return NextResponse.redirect(new URL(casa, req.url));
    // Rol acotado sin permiso para esta sección → al dashboard.
    if (!puedeAccederAdmin(rol, path)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // /caja: solo el cajero (y administración, para revisar). El resto, a su app.
  if (path.startsWith("/caja")) {
    if (!ROLES_CAJA.includes(rol) && !ROLES_FULL.includes(rol)) {
      return NextResponse.redirect(new URL(casa, req.url));
    }
  }

  // /bodega: solo producción/bodega (y administración). El resto, a su app.
  if (path.startsWith("/bodega")) {
    if (!ROLES_BODEGA.includes(rol) && !ROLES_FULL.includes(rol)) {
      return NextResponse.redirect(new URL(casa, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/vendedor/:path*", "/caja/:path*", "/bodega/:path*"],
};
