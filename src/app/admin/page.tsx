import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { canalVentaLabel } from "@/lib/dominio/ventas";
import PanelMontos from "./PanelMontos";

export const dynamic = "force-dynamic";

// Qué líneas son "helado" (congelado) vs "dulce".
const LINEAS_HELADO = new Set(["paletas", "paletas_premium", "postres_500", "cassatas", "tuyyo", "helado", "paleta"]);

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

  // Montos (ocultos con el ojito): comercial + por canal.
  const montos = [
    { label: "Ventas de hoy", valor: fmtCLP(totalHoy), href: "/admin/ventas", accent: "text-slate-900" },
    { label: "Ventas del mes", valor: fmtCLP(totalMes), href: "/admin/ventas", accent: "text-slate-900" },
    { label: "Por cobrar", valor: fmtCLP(porCobrar), href: "/admin/ventas", accent: "text-amber-600" },
    ...canalMes.map((c) => ({ label: canalVentaLabel[c.canal] ?? c.canal, valor: fmtCLP(Number(c._sum.total ?? 0)), href: `/admin/ventas?canal=${c.canal}`, accent: "text-slate-900" })),
  ];

  // Ranking de más vendidos (mes), separado dulce/helado.
  const ids = ventasProd.map((v) => v.productoId);
  const productos = ids.length ? await prisma.producto.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true, linea: true } }) : [];
  const pById = new Map(productos.map((p) => [p.id, p]));
  const ranking = ventasProd
    .map((v) => ({ id: v.productoId, u: Number(v._sum.cantidad ?? 0), p: pById.get(v.productoId) }))
    .filter((r) => r.p && r.u > 0)
    .sort((a, b) => b.u - a.u);
  const helados = ranking.filter((r) => LINEAS_HELADO.has(r.p!.linea)).slice(0, 8);
  const dulces = ranking.filter((r) => !LINEAS_HELADO.has(r.p!.linea)).slice(0, 8);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Panel</h1>
          <p className="text-sm text-slate-500">Operación comercial Benechito</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/pos" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:brightness-105">🛒 Vender</Link>
          <Link href="/admin/negocios/nuevo" className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700">+ Cliente</Link>
        </div>
      </div>

      {/* Conteos (sin dinero) */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Link href="/admin/pedidos" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-2xl font-extrabold text-slate-900">{pedidosPend}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Pedidos pendientes</p>
        </Link>
        <Link href="/admin/negocios" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-2xl font-extrabold text-slate-900">{totalClientes}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Clientes</p>
        </Link>
        <Link href="/admin/dashboard" className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md">
          <p className="text-2xl font-extrabold text-slate-900">📈</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Ver Tablero</p>
        </Link>
      </div>

      {/* Montos con ojito (comercial + por canal) */}
      <PanelMontos items={montos} />

      {/* Más vendidos del mes: dulces vs helados */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <RankingCol titulo="🍫 Dulces más vendidos" filas={dulces} color="#b45309" />
        <RankingCol titulo="🍦 Helados más vendidos" filas={helados} color="#1479c4" />
      </div>
    </div>
  );
}

function RankingCol({ titulo, filas, color }: { titulo: string; filas: { id: string; u: number; p: { nombre: string } | undefined }[]; color: string }) {
  const max = Math.max(1, ...filas.map((f) => f.u));
  return (
    <div>
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Sin ventas este mes.</p>
      ) : (
        <div className="space-y-1.5">
          {filas.map((f, i) => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <span className="w-5 shrink-0 text-center text-sm font-extrabold text-slate-400">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-800">{f.p?.nombre}</span>
              <div className="hidden h-2 w-24 overflow-hidden rounded-full bg-slate-100 sm:block">
                <div className="h-full rounded-full" style={{ width: `${(f.u / max) * 100}%`, backgroundColor: color }} />
              </div>
              <span className="w-12 shrink-0 text-right text-sm font-bold" style={{ color }}>{f.u} u</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
