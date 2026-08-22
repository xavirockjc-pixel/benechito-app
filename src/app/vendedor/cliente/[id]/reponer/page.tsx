import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import ReponerForm from "./ReponerForm";

export const dynamic = "force-dynamic";

export default async function ReponerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await prisma.negocio.findUnique({ where: { id }, select: { nombreNegocio: true } });
  if (!cliente) notFound();

  const u = await usuarioActual();
  const usuario = u ? await prisma.usuario.findUnique({ where: { id: u.sub }, select: { vehiculoId: true } }) : null;
  const vehId = usuario?.vehiculoId ?? null;

  if (!vehId) {
    return (
      <div>
        <Link href={`/vendedor/cliente/${id}`} className="text-sm font-semibold text-[#1479c4]">← {cliente.nombreNegocio}</Link>
        <h1 className="mt-1 text-xl font-extrabold text-slate-900">Reponer</h1>
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Primero elige tu vehículo en <Link href="/vendedor/camion" className="font-semibold text-[#1479c4]">Camión</Link>.
        </p>
      </div>
    );
  }

  const [sabores, caja] = await Promise.all([
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.stockSabor.findMany({ where: { ubicacionId: vehId } }),
  ]);
  const cajaDe = new Map(caja.map((s) => [s.saborId, s.cantidad]));

  const saboresConCaja = sabores.map((s) => ({ id: s.id, nombre: s.nombre, linea: s.linea, enCaja: cajaDe.get(s.id) ?? 0 }));

  return (
    <div>
      <Link href={`/vendedor/cliente/${id}`} className="text-sm font-semibold text-[#1479c4]">← {cliente.nombreNegocio}</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">Reponer por sabor</h1>
      <p className="text-xs text-slate-500">Anota cuántas de cada sabor dejaste. Se descuentan de tu caja.</p>

      <ReponerForm negocioId={id} sabores={saboresConCaja} />
    </div>
  );
}
