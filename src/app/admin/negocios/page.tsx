import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { TIPOS_CLIENTE, tipoClienteLabel, compraLabel } from "@/lib/dominio/precios";

export const dynamic = "force-dynamic";

export default async function NegociosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; q?: string }>;
}) {
  const { tipo, q } = await searchParams;
  const filtroTipo = tipo && (TIPOS_CLIENTE as readonly string[]).includes(tipo) ? tipo : undefined;

  const negocios = await prisma.negocio.findMany({
    where: {
      tipoCliente: filtroTipo,
      ...(q
        ? { OR: [{ nombreNegocio: { contains: q, mode: "insensitive" } }, { nombreContacto: { contains: q, mode: "insensitive" } }, { comuna: { contains: q, mode: "insensitive" } }] }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Clientes</h1>
        <Link href="/admin/negocios/nuevo" className="rounded-full bg-[#1479c4] px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-110">+ Nuevo</Link>
      </div>

      <form className="mt-4" action="/admin/negocios">
        {filtroTipo && <input type="hidden" name="tipo" value={filtroTipo} />}
        <input name="q" defaultValue={q ?? ""} placeholder="Buscar por nombre, contacto o comuna…" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#1479c4]" />
      </form>

      {/* Filtros por tipo de cliente */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/admin/negocios" className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${!filtroTipo ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200"}`}>Todos</Link>
        {TIPOS_CLIENTE.map((t) => (
          <Link key={t} href={`/admin/negocios?tipo=${t}`} className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${filtroTipo === t ? "bg-[#1479c4] text-white ring-[#1479c4]" : "bg-white text-slate-600 ring-slate-200"}`}>
            {tipoClienteLabel[t] ?? t}
          </Link>
        ))}
      </div>

      {/* Lista */}
      <div className="mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        {negocios.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No hay clientes{filtroTipo ? " de este tipo" : ""}.</p>}
        {negocios.map((n) => (
          <Link key={n.id} href={`/admin/negocios/${n.id}`} className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{n.nombreNegocio}</p>
              <p className="truncate text-xs text-slate-500">{n.nombreContacto} · {n.comuna} · {n.whatsapp}</p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {n.compra && <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{compraLabel[n.compra] ?? n.compra}</span>}
              <span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-bold text-[#1479c4]">{tipoClienteLabel[n.tipoCliente] ?? n.tipoCliente}</span>
            </div>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-500">{negocios.length} cliente(s)</p>
    </div>
  );
}
