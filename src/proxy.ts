import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "benechito-dev-secret-cambiar"
);

// Roles que trabajan en terreno: solo ven la app del vendedor, no el panel.
const ROLES_TERRENO = ["vendedor", "chofer"];

/**
 * Protege /admin/* y /vendedor/*: si no hay sesión válida, redirige a /login.
 * Además separa por rol: los de terreno (vendedor/chofer) no entran al panel;
 * quedan en su app. Los de administración no necesitan la app de terreno.
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

  // Vendedor/chofer intentando entrar al panel → lo mandamos a su app.
  if (req.nextUrl.pathname.startsWith("/admin") && ROLES_TERRENO.includes(rol)) {
    return NextResponse.redirect(new URL("/vendedor", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/vendedor/:path*"],
};
