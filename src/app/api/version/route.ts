import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Identificador de la versión desplegada. Cambia en cada deploy, así el cliente
// detecta que hay una versión nueva y recarga la pestaña vieja (evita el error
// "Failed to find Server Action"). Usa el BUILD_ID de Next; si no, la hora de
// arranque del proceso (que también cambia en cada despliegue).
const INICIO = Date.now().toString(36);
let cache: string | null = null;

function version(): string {
  if (cache) return cache;
  try {
    cache = readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim() || INICIO;
  } catch {
    cache = String(process.env.BUILD_ID ?? INICIO);
  }
  return cache;
}

export async function GET() {
  return NextResponse.json({ v: version() }, { headers: { "cache-control": "no-store" } });
}
