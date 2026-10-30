import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FacturaRapida from "./FacturaRapida";

export const dynamic = "force-dynamic";

export default async function FacturaRapidaPage({ searchParams }: { searchParams: Promise<{ cliente?: string; error?: string }> }) {
  const { cliente, error } = await searchParams;
  const negocios = await prisma.negocio.findMany({
    where: { nombreNegocio: { not: "Consumidor Final" } },
    select: { id: true, nombreNegocio: true, rut: true, razonSocial: true, giro: true, comuna: true },
    orderBy: { nombreNegocio: "asc" },
    take: 1500,
  });
  const clientes = negocios.map((n) => ({
    id: n.id, nombre: n.nombreNegocio, rut: n.rut ?? "", razonSocial: n.razonSocial ?? "", giro: n.giro ?? "", comuna: n.comuna ?? "",
  }));
  const prefill = cliente ? clientes.find((c) => c.id === cliente) ?? null : null;

  return (
    <div className="mx-auto max-w-lg space-y-3">
      <div>
        <Link href="/vendedor/facturar" className="text-sm font-semibold text-[#1479c4]">← Por facturar</Link>
        <h1 className="mt-1 text-xl font-extrabold text-slate-900">🧾 Factura rápida (a mano)</h1>
        <p className="text-xs text-slate-500">Escribe el monto o el producto a mano, sin catálogo ni mover stock. Para facturar algo que ya se vendió.</p>
      </div>
      {error === "factura" && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
          ⚠️ Faltan datos tributarios del cliente (RUT, razón social o giro). Complétalos abajo.
        </p>
      )}
      <FacturaRapida clientes={clientes} prefill={prefill} />
    </div>
  );
}
