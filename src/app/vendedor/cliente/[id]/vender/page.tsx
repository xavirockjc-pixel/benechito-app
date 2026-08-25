import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listaParaCliente } from "@/lib/dominio/precios";
import VenderTerreno from "./VenderTerreno";

export const dynamic = "force-dynamic";

export default async function VenderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await prisma.negocio.findUnique({ where: { id } });
  if (!cliente) notFound();

  const listaId = await listaParaCliente(id);
  const lista = listaId ? await prisma.listaPrecio.findUnique({ where: { id: listaId } }) : null;

  const precios = listaId
    ? await prisma.precioProducto.findMany({
        where: { listaId, cantidadMinima: 1 },
        include: { producto: { select: { id: true, nombre: true, formato: true, activo: true, soloLocal: true } } },
      })
    : [];

  const productos = precios
    .filter((p) => p.producto.activo && !p.producto.soloLocal)
    .map((p) => ({ id: p.producto.id, nombre: p.producto.nombre, formato: p.producto.formato, precio: Number(p.precio) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return (
    <div>
      <Link href={`/vendedor/cliente/${id}`} className="text-sm font-semibold text-[#1479c4]">← {cliente.nombreNegocio}</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">Vender</h1>
      <p className="text-xs text-slate-500">Precios de la lista: {lista?.nombre ?? "automática"}</p>

      <div className="mt-3">
        <VenderTerreno negocioId={id} productos={productos} />
      </div>
    </div>
  );
}
