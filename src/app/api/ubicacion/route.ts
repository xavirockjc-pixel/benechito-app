import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";

// Reporte de ubicación del vendedor (GPS). Ruta API estable: su URL NO cambia entre
// despliegues, así que no genera el error "Failed to find Server Action" al Implementar.
export async function POST(req: Request) {
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ ok: false }, { status: 401 });

  let lat = NaN, lng = NaN;
  try {
    const body = await req.json();
    lat = Number(body?.lat);
    lng = Number(body?.lng);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  await prisma.usuario.update({
    where: { id: u.sub },
    data: { ultimaLat: lat, ultimaLng: lng, ubicacionEn: new Date() },
  });
  return NextResponse.json({ ok: true });
}
