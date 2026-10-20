import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { lineaLabel } from "@/lib/dominio/produccion";
import { rolLabel } from "@/lib/dominio/usuarios";
import AutoRefresh from "../repartidores/AutoRefresh";

export const dynamic = "force-dynamic";

const num = (d: unknown) => Number(d ?? 0) || 0;

/** Hace cuánto reportó (para la ubicación en vivo del vendedor). */
function hace(d: Date | null): { txt: string; color: string } {
  if (!d) return { txt: "sin reportar", color: "#94a3b8" };
  const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  const color = min <= 10 ? "#2f9e44" : min <= 60 ? "#f28a1e" : "#e23b2c";
  if (min < 1) return { txt: "recién", color };
  if (min < 60) return { txt: `hace ${min} min`, color };
  const h = Math.floor(min / 60);
  if (h < 24) return { txt: `hace ${h} h`, color };
  return { txt: `hace ${Math.floor(h / 24)} d`, color };
}

export default async function ResumenPorApp() {
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

  const [
    prodHoy, movsHoy, stockTot, local, cajaAbierta, ruta, anotadosPend, pedidosOnline, repartidores,
  ] = await Promise.all([
    // Fabricación: unidades producidas hoy, por línea.
    prisma.controlCalidad.groupBy({ by: ["refId"], _sum: { cantidad: true }, where: { clase: "linea", fecha: { gte: inicioHoy } } }),
    // Bodega: movimientos de stock de hoy (ingresos / salidas).
    prisma.movimientoStock.groupBy({ by: ["tipo"], _sum: { cantidad: true }, _count: true, where: { fecha: { gte: inicioHoy } } }),
    prisma.stock.aggregate({ _sum: { cantidad: true }, where: { cantidad: { gt: 0 } } }),
    // Local: ventas de hoy.
    prisma.venta.aggregate({ _sum: { total: true }, _count: true, where: { canal: "local", fecha: { gte: inicioHoy } } }),
    prisma.sesionCaja.findFirst({ where: { estado: "abierta" }, select: { fechaApertura: true } }),
    // Repartidor: ventas de ruta hoy + pedidos por entregar.
    prisma.venta.aggregate({ _sum: { total: true }, _count: true, where: { canal: "terreno", fecha: { gte: inicioHoy } } }),
    prisma.pedidoReparto.count({ where: { estado: { in: ["pendiente", "en_ruta"] } } }),
    prisma.pedido.count({ where: { canal: "online", estado: { notIn: ["entregado", "finalizado"] } } }),
    prisma.usuario.findMany({
      where: { activo: true, rol: { in: ["vendedor", "chofer", "repartidor"] } },
      select: { id: true, nombre: true, rol: true, ultimaLat: true, ultimaLng: true, ubicacionEn: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  // Fabricación
  const prodMap = prodHoy.map((p) => ({ tipo: p.refId ?? "", u: num(p._sum.cantidad) })).filter((x) => x.u > 0).sort((a, b) => b.u - a.u);
  const totProd = prodMap.reduce((s, x) => s + x.u, 0);

  // Bodega: ingresado (ingreso + produccion) vs movido/salidas (venta, transferencia, merma, ajuste)
  const porTipo = new Map(movsHoy.map((m) => [m.tipo, { u: num(m._sum.cantidad), n: m._count }]));
  const sumU = (...tipos: string[]) => tipos.reduce((s, t) => s + (porTipo.get(t)?.u ?? 0), 0);
  const ingresado = sumU("ingreso", "produccion");
  const salidas = sumU("venta", "transferencia", "merma");
  const nMovs = movsHoy.reduce((s, m) => s + m._count, 0);
  const stockTotal = num(stockTot._sum.cantidad);

  // Ubicación en vivo
  const ahoraMs = ahora.getTime();
  const activos = repartidores.filter((r) => r.ubicacionEn && ahoraMs - new Date(r.ubicacionEn).getTime() < 15 * 60000).length;

  return (
    <div className="mx-auto max-w-2xl">
      <AutoRefresh seg={30} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">📋 Resumen de hoy</h1>
          <p className="text-sm text-slate-500 capitalize">{ahora.toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "long" })} · se actualiza solo</p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {/* Fabricación */}
        <Tarjeta icono="🏭" titulo="Fabricación" href="/admin/produccion" color="#0f766e">
          <Gran valor={`${totProd} u`} sub="producidas hoy" />
          {prodMap.length > 0 ? (
            <ul className="mt-1 space-y-0.5 text-xs text-slate-500">
              {prodMap.slice(0, 4).map((x) => <li key={x.tipo} className="flex justify-between"><span>{lineaLabel[x.tipo] ?? x.tipo}</span><b className="text-slate-700">{x.u}</b></li>)}
            </ul>
          ) : <p className="text-xs text-slate-400">Sin producción registrada hoy.</p>}
        </Tarjeta>

        {/* Bodega */}
        <Tarjeta icono="📦" titulo="Bodega" href="/admin/comparar-stock" color="#b45309">
          <div className="flex gap-4">
            <Mini valor={`+${ingresado}`} sub="ingresó" color="#2f9e44" />
            <Mini valor={`−${salidas}`} sub="salió / movió" color="#e23b2c" />
          </div>
          <p className="mt-1 text-xs text-slate-500">{nMovs} movimiento{nMovs === 1 ? "" : "s"} hoy · <b className="text-slate-700">{stockTotal} u</b> en stock</p>
        </Tarjeta>

        {/* Local (Caja) */}
        <Tarjeta icono="🏪" titulo="Local (Caja)" href="/admin/ventas-local" color="#1479c4">
          <Gran valor={fmtCLP(num(local._sum.total))} sub={`${num(local._count)} venta${num(local._count) === 1 ? "" : "s"} hoy`} />
          <p className="mt-1 text-xs font-semibold" style={{ color: cajaAbierta ? "#2f9e44" : "#94a3b8" }}>
            {cajaAbierta ? "🔓 Caja abierta" : "🔒 Caja cerrada"}
            {pedidosOnline > 0 ? <span className="text-slate-500"> · 🛍️ {pedidosOnline} pedido{pedidosOnline === 1 ? "" : "s"} online</span> : null}
          </p>
        </Tarjeta>

        {/* Repartidor (Vendedor) */}
        <Tarjeta icono="🛵" titulo="Repartidor" href="/admin/repartidores" color="#e0730c">
          <Gran valor={fmtCLP(num(ruta._sum.total))} sub={`${num(ruta._count)} venta${num(ruta._count) === 1 ? "" : "s"} en ruta`} />
          <p className="mt-1 text-xs text-slate-500">{anotadosPend} por entregar · 📍 {activos} reportando</p>
        </Tarjeta>
      </div>

      {/* Dónde está cada vendedor (ubicación en vivo) */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wide text-slate-500">📍 Dónde está el vendedor</h2>
          <Link href="/admin/repartidores" className="text-xs font-bold text-[#1479c4]">ver todo →</Link>
        </div>
        {repartidores.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">No hay vendedores/repartidores activos.</p>
        ) : (
          <ul className="space-y-2">
            {repartidores.map((r) => {
              const h = hace(r.ubicacionEn);
              const tienePos = r.ultimaLat != null && r.ultimaLng != null;
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-base" style={{ background: `${h.color}22` }}>🚚</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{r.nombre} <span className="text-xs font-semibold text-slate-400">{rolLabel[r.rol] ?? r.rol}</span></p>
                    <p className="text-xs font-semibold" style={{ color: h.color }}>● {h.txt}</p>
                  </div>
                  {tienePos ? (
                    <a href={`https://www.google.com/maps?q=${r.ultimaLat},${r.ultimaLng}`} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 rounded-lg bg-[#1479c4] px-3 py-2 text-xs font-bold text-white">📍 Ver mapa</a>
                  ) : <span className="shrink-0 text-xs text-slate-400">sin ubicación</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tarjeta({ icono, titulo, href, color, children }: { icono: string; titulo: string; href: string; color: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-extrabold text-slate-800">{icono} {titulo}</span>
        <span className="text-slate-300">→</span>
      </div>
      {children}
    </Link>
  );
}

function Gran({ valor, sub }: { valor: string; sub: string }) {
  return (
    <div>
      <p className="text-2xl font-extrabold text-slate-900 tabular-nums">{valor}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{sub}</p>
    </div>
  );
}

function Mini({ valor, sub, color }: { valor: string; sub: string; color: string }) {
  return (
    <div>
      <p className="text-xl font-extrabold tabular-nums" style={{ color }}>{valor}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{sub}</p>
    </div>
  );
}
