import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ESTADOS, estadoMeta, type Estado } from "@/lib/estados";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const grupos = await prisma.negocio.groupBy({
    by: ["estado"],
    _count: { _all: true },
  });

  const cuenta = (e: Estado) =>
    grupos.find((g) => g.estado === e)?._count._all ?? 0;

  const total = grupos.reduce((s, g) => s + g._count._all, 0);
  const nuevos = cuenta("nuevo");
  const activos = cuenta("punto_activo");
  const instalacionPend = cuenta("instalacion_pendiente");
  const inactivos = cuenta("inactivo");

  // Reposiciones pendientes: puntos activos/reposición con próxima reposición vencida
  const ahora = new Date();
  const reposicionesPend = await prisma.negocio.count({
    where: {
      estado: { in: ["punto_activo", "reposicion"] },
      proximaReposicion: { lte: ahora },
    },
  });

  const kpis = [
    { label: "Prospectos nuevos", valor: nuevos, href: "/admin/negocios?estado=nuevo", color: "#17376a" },
    { label: "Puntos activos", valor: activos, href: "/admin/negocios?estado=punto_activo", color: "#2f7d34" },
    { label: "Instalaciones pendientes", valor: instalacionPend, href: "/admin/negocios?estado=instalacion_pendiente", color: "#b8860b" },
    { label: "Reposiciones pendientes", valor: reposicionesPend, href: "/admin/reposiciones", color: "#0e7490" },
    { label: "Clientes inactivos", valor: inactivos, href: "/admin/negocios?estado=inactivo", color: "#8a8a8a" },
    { label: "Total de puntos", valor: total, href: "/admin/negocios", color: "#ef7a1a" },
  ];

  const ultimos = await prisma.negocio.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">Dashboard</h1>
          <p className="text-sm text-choco-2">Evolución de la red Benechito</p>
        </div>
        <Link
          href="/admin/negocios/nuevo"
          className="rounded-full bg-naranja px-4 py-2 text-sm font-bold text-white shadow-md transition hover:bg-naranja-2"
        >
          + Nuevo negocio
        </Link>
      </div>

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {kpis.map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-crema-2 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <p className="text-3xl font-extrabold" style={{ color: k.color }}>
              {k.valor}
            </p>
            <p className="mt-1 text-sm font-semibold text-choco-2">{k.label}</p>
          </Link>
        ))}
      </div>

      {/* Embudo por estado */}
      <h2 className="mt-8 mb-3 text-lg font-bold text-navy">Embudo comercial</h2>
      <div className="space-y-2">
        {ESTADOS.map((e) => {
          const n = cuenta(e);
          const pct = total ? Math.round((n / total) * 100) : 0;
          const meta = estadoMeta[e];
          return (
            <Link
              key={e}
              href={`/admin/negocios?estado=${e}`}
              className="flex items-center gap-3 rounded-xl bg-white p-2.5 ring-1 ring-crema-2 transition hover:ring-naranja/40"
            >
              <span
                className="w-40 shrink-0 rounded-lg px-2 py-1 text-center text-xs font-bold"
                style={{ color: meta.color, backgroundColor: meta.bg }}
              >
                {meta.label}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-crema-2">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, backgroundColor: meta.color }}
                />
              </div>
              <span className="w-8 text-right text-sm font-bold text-navy">{n}</span>
            </Link>
          );
        })}
      </div>

      {/* Últimos ingresos */}
      <h2 className="mt-8 mb-3 text-lg font-bold text-navy">Últimos ingresos</h2>
      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-crema-2">
        {ultimos.length === 0 && (
          <p className="p-4 text-sm text-choco-2">Aún no hay negocios registrados.</p>
        )}
        {ultimos.map((n) => (
          <Link
            key={n.id}
            href={`/admin/negocios/${n.id}`}
            className="flex items-center justify-between border-b border-crema-2 px-4 py-3 last:border-0 hover:bg-crema/40"
          >
            <div>
              <p className="font-semibold text-navy">{n.nombreNegocio}</p>
              <p className="text-xs text-choco-2">
                {n.nombreContacto} · {n.comuna}
              </p>
            </div>
            <span
              className="rounded-lg px-2 py-1 text-xs font-bold"
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
    </div>
  );
}
