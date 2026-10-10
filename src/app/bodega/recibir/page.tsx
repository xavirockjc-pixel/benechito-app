import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ubicacionProduccionId } from "@/lib/dominio/ubicaciones";
import RecibirProduccion from "./RecibirProduccion";

export const dynamic = "force-dynamic";

export default async function RecibirPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const prodUb = await ubicacionProduccionId();

  const [stockSab, stockProd] = prodUb
    ? await Promise.all([
        prisma.stockSabor.findMany({ where: { ubicacionId: prodUb, cantidad: { gt: 0 } }, include: { sabor: { select: { nombre: true } } } }),
        prisma.stock.findMany({ where: { ubicacionId: prodUb, cantidad: { gt: 0 } }, include: { producto: { select: { nombre: true } } } }),
      ])
    : [[], []];

  const items = [
    ...stockProd.map((s) => ({ clase: "prod" as const, refId: s.productoId, nombre: s.producto.nombre, disponible: s.cantidad })),
    ...stockSab.map((s) => ({ clase: "sab" as const, refId: s.saborId, nombre: s.sabor.nombre, disponible: s.cantidad })),
  ].sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/bodega" className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">← Bodega</Link>
        <h1 className="text-xl font-extrabold text-slate-900">📥 Recibir de producción</h1>
      </div>
      <p className="text-sm text-slate-500">
        Esto es lo que Producción fabricó y aún no entra a bodega. Revisa las cantidades y recíbelas.
      </p>

      {ok && <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Recibido. Ya está en el stock de bodega.</p>}

      <RecibirProduccion items={items} />
    </div>
  );
}
