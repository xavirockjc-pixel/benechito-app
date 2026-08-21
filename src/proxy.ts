import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { puedeAccederAdmin, ROLES_TERRENO } from "@/lib/dominio/permisos";

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

  if (path.startsWith("/admin")) {
    // Terreno no entra al panel → a su app.
    if (ROLES_TERRENO.includes(rol)) {
      return NextResponse.redirect(new URL("/vendedor", req.url));
    }
    // Rol acotado sin permiso para esta sección → al dashboard.
    if (!puedeAccederAdmin(rol, path)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/vendedor/:path*"],
};
