import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { getCanalMaps } from "@/lib/dominio/canales";
import PanelMontos from "./PanelMontos";
import AvisoAccesoAdmin from "./AvisoAccesoAdmin";
import EmpezarNuevoDia from "@/app/_shared/EmpezarNuevoDia";
import { empezarNuevoDia } from "@/app/bodega/actions";

export const dynamic = "force-dynamic";

// Qué líneas son "helado" (congelado) vs "dulce".
const LINEAS_HELADO = new Set(["paletas", "paletas_premium", "postres_500", "cassatas", "tuyyo", "helado", "paleta"]);

// Paleta de marca para rotar en las tarjetas por canal.
const COLORES_CANAL = ["#d8a944", "#2f9e44", "#1479c4", "#f28a1e", "#e23b2c"];

export default async function Panel({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioSemana = new Date(inicioHoy); inicioSemana.setDate(inicioHoy.getDate() - ((inicioHoy.getDay() + 6) % 7)); // lunes

  // Período elegido (por defecto HOY, para que no se acumulen los números).
  const sp = await searchParams;
  const periodo = sp.p === "semana" ? "semana" : sp.p === "mes" ? "mes" : "hoy";
  const desde = periodo === "mes" ? inicioMes : periodo === "semana" ? inicioSemana : inicioHoy;
  const periodoLabel = periodo === "mes" ? "del mes" : periodo === "semana" ? "de la semana" : "de hoy";

  const [ventasPeriodo, sumaVentas, sumaPagos, pedidosPend, totalClientes, canalPeriodo, ventasProd] = await Promise.all([
    prisma.venta.aggregate({ _sum: { total: true }, where: { fecha: { gte: desde } } }),
    prisma.venta.aggregate({ _sum: { total: true } }),
    prisma.pago.aggregate({ _sum: { monto: true } }),
    prisma.pedido.count({ where: { estado: { notIn: ["entregado", "finalizado"] } } }),
    prisma.negocio.count(),
    prisma.venta.groupBy({ by: ["canal"], _sum: { total: true }, where: { fecha: { gte: desde } } }),
    prisma.movimientoStock.groupBy({ by: ["productoId"], _sum: { cantidad: true }, where: { tipo: "venta", fecha: { gte: desde } } }),
  ]);

  const totalPeriodo = Number(ventasPeriodo._sum.total ?? 0);
  const porCobrar = Math.max(0, Number(sumaVentas._sum.total ?? 0) - Number(sumaPagos._sum.monto ?? 0));
  const { label: canalLabel } = await getCanalMaps();

  // Montos (ocultos con el ojito): venta del período + desglose por canal + deuda total.
  const montos = [
    { label: `Ventas ${periodoLabel}`, valor: fmtCLP(totalPeriodo), href: "/admin/ventas", color: "#1479c4", icon: "💰" },
    ...canalPeriodo
      .filter((c) => Number(c._sum.total ?? 0) > 0)
      .sort((a, b) => Number(b._sum.total ?? 0) - Number(a._sum.total ?? 0))
      .map((c, i) => ({
        label: `${canalLabel[c.canal] ?? c.canal} ${periodoLabel}`,
        valor: fmtCLP(Number(c._sum.total ?? 0)),
        href: `/admin/ventas?canal=${c.canal}`,
        color: COLORES_CANAL[i % COLORES_CANAL.length],
        icon: "📊",
      })),
    { label: "Por cobrar (deuda total)", valor: fmtCLP(porCobrar), href: "/admin/cobranza", color: "#e23b2c", icon: "⏳" },
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

  // Estado de puesta en marcha (para invitar a "Primeros pasos" si falta algo).
  const [nTrab, nProd, nPrec, nStk] = await Promise.all([
    prisma.trabajador.count(),
    prisma.producto.count({ where: { activo: true } }),
    prisma.precioProducto.count(),
    prisma.stock.count({ where: { cantidad: { gt: 0 } } }),
  ]);
  const listosArranque = [nTrab > 0, nProd > 0, nPrec > 0, nStk > 0, Number(sumaVentas._sum.total ?? 0) > 0].filter(Boolean).length;
  const arranqueCompleto = listosArranque === 5;

  // El cerebro: cuántas cosas notó que faltó actualizar/revisar.
  const { contarPendientesCerebro } = await import("@/lib/dominio/cerebroPendientes");
  const nCerebro = await contarPendientesCerebro();

  return (
    <div>
      <AvisoAccesoAdmin />
      {!arranqueCompleto && (
        <Link href="/admin/primeros-pasos" className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-[#f28a1e] to-[#e0730c] px-5 py-4 text-white shadow-md transition hover:brightness-105">
          <span className="min-w-0">
            <span className="block text-base font-extrabold">🚀 Termina de dejar tu sistema andando</span>
            <span className="block text-sm text-white/90">{listosArranque} de 5 pasos listos — te faltan {5 - listosArranque}. Toca para continuar.</span>
          </span>
          <span className="shrink-0 text-2xl">→</span>
        </Link>
      )}
      {nCerebro > 0 && (
        <Link href="/admin/pendientes" className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm transition hover:brightness-[0.99]">
          <span className="min-w-0">
            <span className="block text-base font-extrabold text-amber-800">🐝 El cerebro notó {nCerebro} cosa{nCerebro > 1 ? "s" : ""} por revisar</span>
            <span className="block text-sm text-amber-700">Algo quedó sin actualizar o sin cuadrar. Toca para arreglar u omitir.</span>
          </span>
          <span className="shrink-0 text-2xl text-amber-500">→</span>
        </Link>
      )}
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
          <Link href="/admin/cobranza" className="rounded-2xl bg-[#e23b2c] px-5 py-2.5 text-sm font-extrabold text-white shadow-md transition hover:brightness-110">💸 Cobrar</Link>
          <Link href="/admin/negocios/nuevo" className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-extrabold text-slate-700 transition hover:-translate-y-0.5">＋ Cliente</Link>
        </div>
      </div>

      {/* Período: Hoy / Semana / Mes (para que los números no se acumulen) */}
      <div className="mt-4 inline-flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {([["hoy", "Hoy"], ["semana", "Semana"], ["mes", "Mes"]] as const).map(([k, lbl]) => (
          <Link key={k} href={`/admin?p=${k}`} className={`rounded-lg px-4 py-1.5 text-sm font-bold ${periodo === k ? "bg-slate-900 text-white" : "text-slate-500"}`}>{lbl}</Link>
        ))}
      </div>

      {/* Montos con ojito (venta del período + por canal) */}
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

      {/* Empezar nuevo día para Bodega y Producción (oculta lo anterior, no borra) */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:max-w-md">
        <p className="text-sm font-bold text-slate-900">📅 Cerrar el día (Bodega y Producción)</p>
        <p className="mt-0.5 text-xs text-slate-500">Cierra el día y arranca un cómputo nuevo. Lo anterior queda guardado (oculto), no se borra. Para reiniciar los números de verdad, usa <b>Reiniciar números</b> en el menú.</p>
        <EmpezarNuevoDia action={empezarNuevoDia} label="Cerrar el día (empezar cómputo nuevo)" />
      </div>

      {/* Más vendidos del período: dulces vs helados */}
      <div className="mt-8">
        <h2 className="font-display text-base font-extrabold text-slate-900">Más vendidos {periodoLabel}</h2>
        <p className="mb-3 text-xs text-slate-500">Cuenta <b>todas las ventas que descuentan stock</b>: local (caja), ruta/terreno (camión del vendedor) y bodega (retiros de distribuidores). No separa por lugar.</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <RankingCol titulo="🍫 Dulces más vendidos" filas={dulces} color="#e0730c" periodo={periodoLabel} />
          <RankingCol titulo="🍦 Helados más vendidos" filas={helados} color="#1479c4" periodo={periodoLabel} />
        </div>
      </div>
    </div>
  );
}

function RankingCol({ titulo, filas, color, periodo }: { titulo: string; filas: { id: string; u: number; p: { nombre: string } | undefined }[]; color: string; periodo: string }) {
  const max = Math.max(1, ...filas.map((f) => f.u));
  return (
    <div className="kpi-card">
      <h2 className="mb-3 font-display text-base font-extrabold text-slate-900">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Sin ventas {periodo}.</p>
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
