import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "benechito-dev-secret-cambiar"
);

/** Protege /panel/*: si no hay sesión válida, redirige a /login. */
export async function proxy(req: NextRequest) {
  const token = req.cookies.get("benechito_session")?.value;
  let valido = false;
  if (token) {
    try {
      await jwtVerify(token, secret);
      valido = true;
    } catch {
      valido = false;
    }
  }

  if (!valido) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*"],
};
