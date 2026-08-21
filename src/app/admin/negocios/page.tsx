import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ESTADOS, estadoMeta, esEstado, type Estado } from "@/lib/estados";

export const dynamic = "force-dynamic";

export default async function NegociosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; q?: string }>;
}) {
  const { estado, q } = await searchParams;
  const filtroEstado = estado && esEstado(estado) ? estado : undefined;

  const negocios = await prisma.negocio.findMany({
    where: {
      estado: filtroEstado,
      ...(q
        ? {
            OR: [
              { nombreNegocio: { contains: q } },
              { nombreContacto: { contains: q } },
              { comuna: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-navy">Negocios</h1>
        <Link
          href="/admin/negocios/nuevo"
          className="rounded-full bg-naranja px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-naranja-2"
        >
          + Nuevo
        </Link>
      </div>

      {/* Buscador */}
      <form className="mt-4" action="/admin/negocios">
        {filtroEstado && <input type="hidden" name="estado" value={filtroEstado} />}
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por negocio, contacto o comuna…"
          className="w-full rounded-xl border border-crema-2 bg-white px-4 py-2.5 text-sm outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30"
        />
      </form>

      {/* Filtros por estado */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/admin/negocios"
          className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${
            !filtroEstado ? "bg-navy text-white ring-navy" : "bg-white text-navy ring-crema-2"
          }`}
        >
          Todos
        </Link>
        {ESTADOS.map((e) => (
          <Link
            key={e}
            href={`/admin/negocios?estado=${e}`}
            className="rounded-full px-3 py-1 text-xs font-bold ring-1"
            style={
              filtroEstado === e
                ? { color: "#fff", backgroundColor: estadoMeta[e].color, borderColor: estadoMeta[e].color }
                : { color: estadoMeta[e].color, backgroundColor: estadoMeta[e].bg, borderColor: "transparent" }
            }
          >
            {estadoMeta[e].label}
          </Link>
        ))}
      </div>

      {/* Lista */}
      <div className="mt-5 overflow-hidden rounded-2xl bg-white ring-1 ring-crema-2">
        {negocios.length === 0 && (
          <p className="p-6 text-center text-sm text-choco-2">
            No hay negocios{filtroEstado ? " en este estado" : ""}.
          </p>
        )}
        {negocios.map((n) => (
          <Link
            key={n.id}
            href={`/admin/negocios/${n.id}`}
            className="flex items-center justify-between gap-3 border-b border-crema-2 px-4 py-3 last:border-0 hover:bg-crema/40"
          >
            <div className="min-w-0">
              <p className="truncate font-semibold text-navy">{n.nombreNegocio}</p>
              <p className="truncate text-xs text-choco-2">
                {n.nombreContacto} · {n.comuna} · {n.whatsapp}
              </p>
            </div>
            <span
              className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold"
              style={{
                color: estadoMeta[n.estado as Estado]?.color,
                backgroundColor: estadoMeta[n.estado as Estado]?.bg,
              }}
            >
              {estadoMeta[n.estado as Estado]?.label ?? n.estado}
            </span>
          </Link>
        ))}
      </div>
      <p className="mt-3 text-sm text-choco-2">{negocios.length} negocio(s)</p>
    </div>
  );
}
