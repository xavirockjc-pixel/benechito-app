import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { getCanalMaps } from "@/lib/dominio/canales";
import PanelMontos from "./PanelMontos";

export const dynamic = "force-dynamic";

// Qué líneas son "helado" (congelado) vs "dulce".
const LINEAS_HELADO = new Set(["paletas", "paletas_premium", "postres_500", "cassatas", "tuyyo", "helado", "paleta"]);

// Paleta de marca para rotar en las tarjetas por canal.
const COLORES_CANAL = ["#d8a944", "#2f9e44", "#1479c4", "#f28a1e", "#e23b2c"];

export default async function Panel() {
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const [ventasHoy, ventasMes, sumaVentas, sumaPagos, pedidosPend, totalClientes, canalMes, ventasProd] = await Promise.all([
    prisma.venta.aggregate({ _sum: { total: true }, where: { fecha: { gte: inicioHoy } } }),
    prisma.venta.aggregate({ _sum: { total: true }, where: { fecha: { gte: inicioMes } } }),
    prisma.venta.aggregate({ _sum: { total: true } }),
    prisma.pago.aggregate({ _sum: { monto: true } }),
    prisma.pedido.count({ where: { estado: { notIn: ["entregado", "finalizado"] } } }),
    prisma.negocio.count(),
    prisma.venta.groupBy({ by: ["canal"], _sum: { total: true }, where: { fecha: { gte: inicioMes } } }),
    prisma.movimientoStock.groupBy({ by: ["productoId"], _sum: { cantidad: true }, where: { tipo: "venta", fecha: { gte: inicioMes } } }),
  ]);

  const totalHoy = Number(ventasHoy._sum.total ?? 0);
  const totalMes = Number(ventasMes._sum.total ?? 0);
  const porCobrar = Math.max(0, Number(sumaVentas._sum.total ?? 0) - Number(sumaPagos._sum.monto ?? 0));
  const { label: canalLabel } = await getCanalMaps();

  // Montos (ocultos con el ojito): comercial + por canal, cada uno con su color/ícono.
  const montos = [
    { label: "Ventas de hoy", valor: fmtCLP(totalHoy), href: "/admin/ventas", color: "#1479c4", icon: "💰" },
    { label: "Ventas del mes", valor: fmtCLP(totalMes), href: "/admin/ventas", color: "#f28a1e", icon: "📅" },
    { label: "Por cobrar", valor: fmtCLP(porCobrar), href: "/admin/ventas", color: "#e23b2c", icon: "⏳" },
    ...canalMes
      .filter((c) => Number(c._sum.total ?? 0) > 0)
      .map((c, i) => ({
        label: canalLabel[c.canal] ?? c.canal,
        valor: fmtCLP(Number(c._sum.total ?? 0)),
        href: `/admin/ventas?canal=${c.canal}`,
        color: COLORES_CANAL[i % COLORES_CANAL.length],
        icon: "📊",
      })),
  ];

  // Ranking de más vendidos (mes), separado dulce/helado.
  const ids = ventasProd.map((v) => v.productoId);
  const productos = ids.length ? await prisma.producto.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, linea: true } }) : [];
  const pById = new Map(productos.map((p) => [p.id, p]));
  const ranking = ventasProd
    .map((v) => ({ id: v.productoId, u: Number(v._sum.cantidad ?? 0), p: pById.get(v.productoId) }))
    .filter((r) => r.p && r.u > 0)
    .sort((a, b) => b.u - a.u);
  const helados = ranking.filter((r) => LINEAS_HELADO.has(r.p!.linea)).slice(0, 6);
  const dulces = ranking.filter((r) => !LINEAS_HELADO.has(r.p!.linea)).slice(0, 6);

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-slate-900">
            Hola, <span style={{ color: "#e0730c" }}>Benechito</span> 👋
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">Tu negocio de un vistazo</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/pos" className="rounded-2xl bg-[#1479c4] px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:brightness-110">🛒 Vender</Link>
          <Link href="/admin/negocios/nuevo" className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-700 transition hover:-translate-y-0.5">＋ Cliente</Link>
        </div>
      </div>

      {/* Montos con ojito (comercial + por canal) */}
      <PanelMontos items={montos} />

      {/* Conteos rápidos (sin dinero) */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Link href="/admin/pedidos" className="kpi-card card-dyn" style={{ "--kc": "#2f9e44" } as React.CSSProperties}>
          <div className="kpi-ic">📋</div>
          <p className="kpi-lab">Pedidos pendientes</p>
          <p className="kpi-val">{pedidosPend}</p>
        </Link>
        <Link href="/admin/negocios" className="kpi-card card-dyn" style={{ "--kc": "#1479c4" } as React.CSSProperties}>
          <div className="kpi-ic">👥</div>
          <p className="kpi-lab">Clientes</p>
          <p className="kpi-val">{totalClientes}</p>
        </Link>
        <Link href="/admin/dashboard" className="kpi-card card-dyn" style={{ "--kc": "#f28a1e" } as React.CSSProperties}>
          <div className="kpi-ic">📈</div>
          <p className="kpi-lab">Ver tablero completo</p>
          <p className="kpi-val" style={{ fontSize: "18px" }}>Abrir →</p>
        </Link>
      </div>

      {/* Más vendidos del mes: dulces vs helados */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <RankingCol titulo="🍫 Dulces más vendidos" filas={dulces} color="#e0730c" />
        <RankingCol titulo="🍦 Helados más vendidos" filas={helados} color="#1479c4" />
      </div>
    </div>
  );
}

function RankingCol({ titulo, filas, color }: { titulo: string; filas: { id: string; u: number; p: { nombre: string } | undefined }[]; color: string }) {
  const max = Math.max(1, ...filas.map((f) => f.u));
  return (
    <div className="kpi-card">
      <h2 className="mb-3 font-display text-base font-extrabold text-slate-900">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Sin ventas este mes.</p>
      ) : (
        <div className="space-y-1">
          {filas.map((f, i) => (
            <div key={f.id} className="flex items-center gap-3 border-b border-slate-100 py-2 last:border-0">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-xs font-extrabold" style={i === 0 ? { background: color, color: "#fff" } : { background: "var(--surface-2)", color: "var(--text-soft)" }}>{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{f.p?.nombre}</span>
              <div className="hidden h-2 w-20 overflow-hidden rounded-full sm:block" style={{ background: "var(--surface-2)" }}>
                <div className="h-full rounded-full" style={{ width: `${(f.u / max) * 100}%`, backgroundColor: color }} />
              </div>
              <span className="w-12 shrink-0 text-right text-sm font-extrabold tabular-nums" style={{ color }}>{f.u} u</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
