import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { motivoDuplicado } from "@/lib/dominio/duplicados";

/** GET /api/negocios/duplicados?nombre=&rut=&whatsapp=&excludeId=
 *  Devuelve posibles clientes duplicados. Uso interno (requiere sesión). */
export async function GET(req: Request) {
  const u = await usuarioActual();
  if (!u) return NextResponse.json({ matches: [] }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const nombre = searchParams.get("nombre") ?? "";
  const rut = searchParams.get("rut") ?? "";
  const whatsapp = searchParams.get("whatsapp") ?? "";
  const excludeId = searchParams.get("excludeId") ?? "";
  if ((nombre + rut + whatsapp).trim().length < 3) return NextResponse.json({ matches: [] });

  const negocios = await prisma.negocio.findMany({
    where: { nombreNegocio: { not: "Consumidor Final" } },
    select: { id: true, nombreNegocio: true, whatsapp: true, rut: true, comuna: true, latitud: true, longitud: true },
    take: 1000,
  });

  const matches = [];
  for (const n of negocios) {
    if (n.id === excludeId) continue;
    const motivo = motivoDuplicado({ nombre, rut, whatsapp }, n);
    if (motivo) matches.push({ id: n.id, nombreNegocio: n.nombreNegocio, comuna: n.comuna, motivo });
    if (matches.length >= 6) break;
  }
  return NextResponse.json({ matches });
}
