import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { reponerPunto } from "../../../actions";

export const dynamic = "force-dynamic";

const lineaLabel: Record<string, string> = { trufa: "Trufas", cuchufli: "Cuchuflís", helado: "Helados" };

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

  const porLinea = sabores.reduce<Record<string, typeof sabores>>((acc, s) => {
    (acc[s.linea] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <Link href={`/vendedor/cliente/${id}`} className="text-sm font-semibold text-[#1479c4]">← {cliente.nombreNegocio}</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">Reponer por sabor</h1>
      <p className="text-xs text-slate-500">Anota cuántas de cada sabor dejaste. Se descuentan de tu caja.</p>

      <form action={reponerPunto} className="mt-4">
        <input type="hidden" name="negocioId" value={id} />

        {Object.entries(porLinea).map(([linea, items]) => (
          <div key={linea} className="mt-4">
            <h2 className="mb-2 text-sm font-bold text-slate-900">{lineaLabel[linea] ?? linea}</h2>
            <div className="space-y-1">
              {items.map((s) => {
                const enCaja = cajaDe.get(s.id) ?? 0;
                return (
                  <label key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-800">{s.nombre}</span>
                      <span className={`block text-xs ${enCaja > 0 ? "text-slate-400" : "text-red-400"}`}>en caja: {enCaja}</span>
                    </span>
                    <input
                      type="number"
                      name={`sabor_${s.id}`}
                      min="0"
                      max={enCaja}
                      step="1"
                      placeholder="0"
                      inputMode="numeric"
                      className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-right text-sm font-semibold"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <button className="sticky bottom-20 mt-5 w-full rounded-xl bg-[#1479c4] py-3 text-base font-extrabold text-white shadow-lg active:brightness-95">
          Confirmar reposición
        </button>
      </form>
    </div>
  );
}
