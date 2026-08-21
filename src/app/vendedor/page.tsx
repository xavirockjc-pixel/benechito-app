import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { tipoClienteLabel } from "@/lib/dominio/precios";
import MiUbicacion from "./MiUbicacion";

export const dynamic = "force-dynamic";

export default async function VendedorHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const busca = (q ?? "").trim();

  const clientes = await prisma.negocio.findMany({
    where: busca
      ? {
          OR: [
            { nombreNegocio: { contains: busca, mode: "insensitive" } },
            { comuna: { contains: busca, mode: "insensitive" } },
            { nombreContacto: { contains: busca, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { nombreNegocio: "asc" },
    take: 60,
    include: { ventas: { select: { total: true, pagos: { select: { monto: true } } } } },
  });

  const conSaldo = clientes.map((c) => {
    const saldo = c.ventas.reduce(
      (s, v) => s + (Number(v.total) - v.pagos.reduce((a, p) => a + Number(p.monto), 0)),
      0,
    );
    return { ...c, saldo };
  });

  return (
    <div>
      <div className="mb-3">
        <MiUbicacion />
      </div>

      <h1 className="text-xl font-extrabold text-slate-900">Mis clientes</h1>

      <form className="mt-3">
        <input
          name="q"
          defaultValue={busca}
          placeholder="Buscar por negocio, comuna…"
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-[#1479c4]"
        />
      </form>

      <div className="mt-4 space-y-2">
        {conSaldo.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {busca ? "Sin resultados." : "No hay clientes aún."}
          </p>
        )}
        {conSaldo.map((c) => (
          <Link
            key={c.id}
            href={`/vendedor/cliente/${c.id}`}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
          >
            <div className="min-w-0">
              <p className="truncate font-bold text-slate-900">{c.nombreNegocio}</p>
              <p className="truncate text-xs text-slate-500">
                {c.comuna || "—"} · {tipoClienteLabel[c.tipoCliente] ?? c.tipoCliente}
              </p>
            </div>
            {c.saldo > 0 ? (
              <span className="ml-2 shrink-0 rounded-lg bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
                Debe {fmtCLP(c.saldo)}
              </span>
            ) : (
              <span className="ml-2 shrink-0 text-slate-300">›</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
