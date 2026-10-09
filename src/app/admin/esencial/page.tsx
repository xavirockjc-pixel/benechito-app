import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { lineaLabel, PERFIL_LINEA, ORDEN_LINEAS } from "@/lib/dominio/produccion";

export const dynamic = "force-dynamic";

const num = (d: unknown) => Number(d ?? 0) || 0;

export default async function Esencial() {
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicio7 = new Date(inicioHoy.getTime() - 7 * 24 * 3600 * 1000);
  const fin7 = new Date(inicioHoy.getTime() + 7 * 24 * 3600 * 1000);

  const [
    prodHoy, prod7, stockRows, localHoy, rutaHoy, deben, agenda, agendaCount, mejoras, notasAb, sugeridas,
  ] = await Promise.all([
    prisma.controlCalidad.groupBy({ by: ["refId"], _sum: { cantidad: true }, where: { clase: "linea", fecha: { gte: inicioHoy } } }),
    prisma.controlCalidad.groupBy({ by: ["refId"], _sum: { cantidad: true }, where: { clase: "linea", fecha: { gte: inicio7 } } }),
    prisma.stock.groupBy({ by: ["productoId"], _sum: { cantidad: true }, where: { cantidad: { gt: 0 } } }),
    prisma.venta.aggregate({ _sum: { total: true }, _count: true, where: { canal: "local", fecha: { gte: inicioHoy } } }),
    prisma.venta.aggregate({ _sum: { total: true }, _count: true, where: { canal: "terreno", fecha: { gte: inicioHoy } } }),
    prisma.venta.groupBy({ by: ["negocioId"], _sum: { total: true }, where: { estadoPago: { in: ["pendiente", "parcial", "vencido"] } } }),
    prisma.agenda.findMany({
      where: { estado: { in: ["pendiente", "en_proceso"] }, fecha: { gte: inicioHoy, lt: fin7 } },
      orderBy: { fecha: "asc" }, take: 6, select: { id: true, titulo: true, fecha: true, tipo: true },
    }),
    prisma.agenda.count({ where: { estado: { in: ["pendiente", "en_proceso"] }, fecha: { gte: inicioHoy, lt: fin7 } } }),
    prisma.mejora.findMany({ where: { estado: { not: "hecha" } }, orderBy: [{ prioridad: "asc" }, { createdAt: "desc" }], take: 6, select: { id: true, titulo: true, estado: true } }),
    prisma.nota.count({ where: { estado: { not: "hecha" }, accionEstado: { not: "sugerida" } } }),
    prisma.nota.count({ where: { accionEstado: "sugerida" } }),
  ]);

  // Producción por tipo (hoy y 7 días).
  const prodHoyMap = new Map(prodHoy.map((p) => [p.refId ?? "", num(p._sum.cantidad)]));
  const prod7Map = new Map(prod7.map((p) => [p.refId ?? "", num(p._sum.cantidad)]));
  const totHoy = [...prodHoyMap.values()].reduce((s, n) => s + n, 0);
  const tot7 = [...prod7Map.values()].reduce((s, n) => s + n, 0);
  const tiposSet = new Set([...prodHoyMap.keys(), ...prod7Map.keys()].filter(Boolean));
  const tipos = [
    ...ORDEN_LINEAS.filter((l) => tiposSet.has(l)),
    ...[...tiposSet].filter((l) => !ORDEN_LINEAS.includes(l)),
  ];

  const stockU = stockRows.reduce((s, r) => s + num(r._sum.cantidad), 0);
  const debenTotal = deben.reduce((s, d) => s + num(d._sum.total), 0);
  const debenClientes = deben.filter((d) => d.negocioId).length;
  const mejorasTot = await prisma.mejora.count({ where: { estado: { not: "hecha" } } });

  const fmtF = (d: Date) => new Date(d).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">⭐ Lo esencial</h1>
      <p className="text-sm text-slate-500">Lo importante de un vistazo. Toca cualquier tarjeta para ver el detalle.</p>

      {/* Producción por tipo */}
      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">🏭 Producción por tipo</h2>
          <Link href="/admin/rentabilidad-productos" className="text-xs font-bold text-[#1479c4]">Ver rentabilidad →</Link>
        </div>
        {tipos.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay producción registrada.</p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-b border-slate-100 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              <span>Tipo</span><span className="text-right">Hoy</span><span className="text-right">7 días</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {tipos.map((t) => {
                const c = PERFIL_LINEA[t]?.color ?? "#64748b";
                return (
                  <li key={t} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-1.5 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-slate-700">
                      <span>{PERFIL_LINEA[t]?.icono ?? "📦"}</span>
                      <span style={{ color: c }}>{lineaLabel[t] ?? t}</span>
                    </span>
                    <span className="text-right font-extrabold text-slate-900">{prodHoyMap.get(t) ?? 0}</span>
                    <span className="text-right font-semibold text-slate-500">{prod7Map.get(t) ?? 0}</span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-1 grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-t border-slate-200 pt-1.5 text-sm font-extrabold">
              <span className="text-slate-700">Total</span>
              <span className="text-right text-[#1479c4]">{totHoy} u.</span>
              <span className="text-right text-slate-500">{tot7} u.</span>
            </div>
          </>
        )}
      </section>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Stock */}
        <Card href="/admin/inventario" icon="📦" titulo="Lo que hay en stock" acento="#0f766e">
          <Dato grande={`${stockU} u.`} chico={`${stockRows.length} productos con existencia`} />
        </Card>

        {/* Vendido local */}
        <Card href="/admin/ventas-local" icon="🏪" titulo="Vendido en Local (hoy)" acento="#2f9e44">
          <Dato grande={fmtCLP(num(localHoy._sum.total))} chico={`${num(localHoy._count)} ventas`} />
        </Card>

        {/* Vendido ruta */}
        <Card href="/admin/ventas" icon="🚚" titulo="Vendido en Ruta (hoy)" acento="#f28a1e">
          <Dato grande={fmtCLP(num(rutaHoy._sum.total))} chico={`${num(rutaHoy._count)} ventas`} />
        </Card>

        {/* Clientes que deben */}
        <Card href="/admin/cobranza" icon="💸" titulo="Clientes que deben" acento="#e23b2c">
          <Dato grande={fmtCLP(debenTotal)} chico={`${debenClientes} cliente${debenClientes === 1 ? "" : "s"}`} />
        </Card>

        {/* Clientes agendados */}
        <Card href="/admin/agenda" icon="📅" titulo="Agendados (7 días)" acento="#8b5cf6">
          <Dato grande={`${agendaCount}`} chico="apartados / entregas / visitas" />
          {agenda.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
              {agenda.slice(0, 3).map((a) => (
                <li key={a.id}>• {a.titulo} <span className="text-slate-400">— {fmtF(a.fecha)}</span></li>
              ))}
            </ul>
          )}
        </Card>

        {/* Asuntos por hacer */}
        <Card href="/admin/mejoras" icon="✅" titulo="Asuntos por hacer" acento="#d97706">
          <Dato grande={`${mejorasTot}`} chico="pendientes y mejoras" />
          {mejoras.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-[11px] text-slate-500">
              {mejoras.slice(0, 3).map((m) => (
                <li key={m.id}>• {m.estado === "en_proceso" ? "🔧" : "⭕"} {m.titulo}</li>
              ))}
            </ul>
          )}
        </Card>

        {/* Notas y acciones */}
        <Card href="/admin/notas" icon="📝" titulo="Notas y acciones" acento="#334155">
          <Dato grande={`${notasAb}`} chico="notas abiertas" />
          {sugeridas > 0 && <p className="mt-1 text-[11px] font-bold text-amber-600">⚡ {sugeridas} por confirmar (ej. “llegó leche”)</p>}
        </Card>
      </div>

      <p className="mt-4 text-center text-[11px] text-slate-400">
        ¿Falta algo aquí o sobra? Dímelo y lo ajusto. La idea es que esta sea tu pantalla del día a día. 🐝
      </p>
    </div>
  );
}

function Card({ href, icon, titulo, acento, children }: { href: string; icon: string; titulo: string; acento: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.99]">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg text-lg" style={{ background: `${acento}1a` }}>{icon}</span>
        <span className="text-sm font-bold" style={{ color: acento }}>{titulo}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">{children}</div>
    </Link>
  );
}

function Dato({ grande, chico }: { grande: string; chico: string }) {
  return (
    <span>
      <span className="block text-2xl font-extrabold leading-tight text-slate-900">{grande}</span>
      <span className="block text-[11px] text-slate-400">{chico}</span>
    </span>
  );
}
