import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { rutaDeComuna } from "@/lib/dominio/sectores";
import MensajeMasivo from "./MensajeMasivo";

export const dynamic = "force-dynamic";

export default async function DifundirPage() {
  const negocios = await prisma.negocio.findMany({
    where: { nombreNegocio: { not: "Consumidor Final" } },
    select: { id: true, nombreNegocio: true, whatsapp: true, comuna: true, sector: true },
    orderBy: { nombreNegocio: "asc" },
    take: 2000,
  });

  const clientes = negocios.map((n) => ({
    id: n.id,
    nombre: n.nombreNegocio,
    tel: n.whatsapp ?? "",
    sector: rutaDeComuna(n.sector || n.comuna).label,
  }));

  // Rutas únicas (agrupadas: San Pedro de la Paz = San Pedro, Lota Alto = Lota…).
  const vistos = new Set<string>();
  const sectores: string[] = [];
  for (const c of clientes) {
    if (c.sector !== "Sin sector" && !vistos.has(c.sector)) { vistos.add(c.sector); sectores.push(c.sector); }
  }
  sectores.sort((a, b) => a.localeCompare(b, "es"));

  const conTel = clientes.filter((c) => c.tel).length;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <Link href="/vendedor?t=dia" className="text-sm font-semibold text-[#1479c4]">← Clientes</Link>
        <h1 className="mt-1 text-xl font-extrabold text-slate-900">📢 Mensaje masivo</h1>
        <p className="text-xs text-slate-500">
          Manda un aviso, promoción o catálogo a tus clientes para que pidan, agenden o confirmen. {conTel} clientes con WhatsApp.
        </p>
      </div>

      <MensajeMasivo clientes={clientes} sectores={sectores} />
    </div>
  );
}
