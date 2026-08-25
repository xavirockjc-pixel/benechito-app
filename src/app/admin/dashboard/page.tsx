import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { CANALES_VENTA, canalVentaLabel, canalVentaColor } from "@/lib/dominio/ventas";

export const dynamic = "force-dynamic";

type Periodo = "hoy" | "semana" | "mes" | "todo";
const PERIODOS: { k: Periodo; label: string }[] = [
  { k: "hoy", label: "Hoy" },
  { k: "semana", label: "Semana" },
  { k: "mes", label: "Mes" },
  { k: "todo", label: "Histórico" },
];

function desdeDe(p: Periodo): Date {
  const n = new Date();
  if (p === "hoy") return new Date(n.getFullYear(), n.getMonth(), n.getDate());
  if (p === "semana") {
    const dia = (n.getDay() + 6) % 7; // lunes = 0
    const d = new Date(n.getFullYear(), n.getMonth(), n.getDate() - dia);
    return d;
  }
  if (p === "mes") return new Date(n.getFullYear(), n.getMonth(), 1);
  return new Date(0);
}

export default async function DashboardMovimientos({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const sp = await searchParams;
  const periodo: Periodo = (["hoy", "semana", "mes", "todo"] as const).includes(sp.periodo as Periodo) ? (sp.periodo as Periodo) : "mes";
  const desde = desdeDe(periodo);

  // Rango de 14 días para el gráfico
  const hace14 = new Date();
  hace14.setDate(hace14.getDate() - 13);
  hace14.setHours(0, 0, 0, 0);

  const [ventas, ventasTodas, pagosTodos, movAgg, opAgg, reposiciones, stocks, stockSab, ventas14] = await Promise.all([
    prisma.venta.findMany({ where: { fecha: { gte: desde } }, include: { pagos: { select: { monto: true, medio: true } }, ubicacion: { select: { tipo: true } } } }),
    prisma.venta.aggregate({ _sum: { total: true } }),
    prisma.pago.aggregate({ _sum: { monto: true } }),
    prisma.movimientoBodega.groupBy({ by: ["zona", "tipo"], where: { fecha: { gte: desde } }, _sum: { cantidad: true } }),
    prisma.ordenProduccion.aggregate({ where: { estado: "terminada", fechaTermino: { gte: desde } }, _count: { _all: true }, _sum: { cantidadReal: true } }),
    prisma.reposicion.findMany({ where: { fecha: { gte: desde } }, include: { items: { select: { cantidad: true } } } }),
    prisma.stock.findMany({ where: { cantidad: { gt: 0 } }, include: { ubicacion: { select: { tipo: true } } } }),
    prisma.stockSabor.aggregate({ _sum: { cantidad: true }, where: { cantidad: { gt: 0 } } }),
    prisma.venta.findMany({ where: { fecha: { gte: hace14 } }, select: { total: true, fecha: true } }),
  ]);

  // Ventas del período
  const totalVendido = ventas.reduce((s, v) => s + Number(v.total), 0);
  const nVentas = ventas.length;
  const ticket = nVentas > 0 ? totalVendido / nVentas : 0;
  let efectivo = 0, otros = 0;
  for (const v of ventas) for (const p of v.pagos) { if (p.medio === "efectivo") efectivo += Number(p.monto); else otros += Number(p.monto); }
  const porCobrar = Math.max(0, Number(ventasTodas._sum.total ?? 0) - Number(pagosTodos._sum.monto ?? 0));

  // Desglose por canal (local / terreno / directa)
  const canalData = CANALES_VENTA.map((c) => {
    const arr = ventas.filter((v) => v.canal === c);
    const tot = arr.reduce((s, v) => s + Number(v.total), 0);
    return { c, tot, n: arr.length, pct: totalVendido > 0 ? Math.round((tot / totalVendido) * 100) : 0 };
  });

  // Movimientos de bodega/producción
  const sumMov = (zona: string, tipo: string) => movAgg.find((m) => m.zona === zona && m.tipo === tipo)?._sum.cantidad ?? 0;
  const fabricado = sumMov("produccion", "entrada");
  const entradasBodega = sumMov("bodega", "entrada");
  const mermas = sumMov("bodega", "merma") + sumMov("sala", "merma");
  const surtidos = sumMov("bodega", "mixto");
  const opCumplidas = opAgg._count._all;

  // Entregas (reposiciones a Puntos)
  const nRepo = reposiciones.length;
  const uRepo = reposiciones.reduce((s, r) => s + r.items.reduce((a, i) => a + i.cantidad, 0), 0);

  // Stock actual (snapshot)
  const stockPorTipo: Record<string, number> = {};
  for (const s of stocks) stockPorTipo[s.ubicacion?.tipo ?? "otro"] = (stockPorTipo[s.ubicacion?.tipo ?? "otro"] ?? 0) + s.cantidad;
  const stockSabores = Number(stockSab._sum.cantidad ?? 0);

  // Gráfico 14 días
  const dias: { dia: string; total: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date(hace14);
    d.setDate(hace14.getDate() + i);
    const label = d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" });
    dias.push({ dia: label, total: 0 });
  }
  for (const v of ventas14) {
    const idx = Math.floor((new Date(v.fecha).setHours(0, 0, 0, 0) - hace14.getTime()) / 86400000);
    if (idx >= 0 && idx < 14) dias[idx].total += Number(v.total);
  }
  const maxDia = Math.max(1, ...dias.map((d) => d.total));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Tablero</h1>
          <p className="text-sm text-slate-500">Todos los movimientos del negocio en un vistazo.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {PERIODOS.map((p) => (
            <Link key={p.k} href={`/admin/dashboard?periodo=${p.k}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-bold ${periodo === p.k ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Ventas */}
      <h2 className="mt-6 mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">💵 Ventas</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Vendido" valor={fmtCLP(totalVendido)} big />
        <Card label="N° de ventas" valor={String(nVentas)} />
        <Card label="Ticket promedio" valor={fmtCLP(Math.round(ticket))} />
        <Card label="Por cobrar (total)" valor={fmtCLP(porCobrar)} accent="text-amber-600" />
        <Card label="Efectivo" valor={fmtCLP(efectivo)} />
        <Card label="Otros medios" valor={fmtCLP(otros)} />
      </div>

      {/* Ventas por canal (desglose) */}
      <h2 className="mt-6 mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">🧭 Ventas por canal</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {canalData.map(({ c, tot, n, pct }) => {
          const col = canalVentaColor[c];
          return (
            <div key={c} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: col.color }}>{canalVentaLabel[c]}</span>
                <span className="rounded-md px-2 py-0.5 text-xs font-bold" style={{ color: col.color, backgroundColor: col.bg }}>{pct}%</span>
              </div>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{fmtCLP(tot)}</p>
              <p className="text-xs text-slate-500">{n} venta(s)</p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: col.color }} />
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Local = caja/sala · Terreno = vendedor en ruta · Directa = venta directa de administración.
      </p>

      {/* Fabricación + Bodega + Entregas */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">🏭 Fabricación</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card label="Producido (u.)" valor={String(fabricado)} />
            <Card label="Órdenes cumplidas" valor={String(opCumplidas)} />
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">📦 Bodega</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card label="Entradas (u.)" valor={String(entradasBodega)} />
            <Card label="Surtidos armados" valor={String(surtidos)} />
            <Card label="Mermas (u.)" valor={String(mermas)} accent="text-red-600" />
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">🔄 Entregas a Puntos</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card label="Reposiciones" valor={String(nRepo)} />
            <Card label="Unidades dejadas" valor={String(uRepo)} />
          </div>
        </div>
      </div>

      {/* Gráfico ventas 14 días */}
      <h2 className="mt-8 mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">📈 Ventas últimos 14 días</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex h-40 items-end gap-1">
          {dias.map((d, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1" title={`${d.dia}: ${fmtCLP(d.total)}`}>
              <div className="flex w-full items-end" style={{ height: "100%" }}>
                <div className="w-full rounded-t bg-[#1479c4]" style={{ height: `${(d.total / maxDia) * 100}%` }} />
              </div>
              <span className="text-[9px] text-slate-400">{d.dia.slice(0, 5)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stock actual (snapshot) */}
      <h2 className="mt-8 mb-2 text-sm font-bold uppercase tracking-wide text-slate-500">📊 Stock actual (ahora)</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="En bodega (u.)" valor={String(stockPorTipo["bodega"] ?? 0)} />
        <Card label="En sala (u.)" valor={String(stockPorTipo["sala"] ?? 0)} />
        <Card label="En camiones (u.)" valor={String(stockPorTipo["vehiculo"] ?? 0)} />
        <Card label="Sabores (u.)" valor={String(stockSabores)} />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Los indicadores por período usan la fecha de cada movimiento. El stock actual es la foto de este momento.
      </p>
    </div>
  );
}

function Card({ label, valor, big, accent }: { label: string; valor: string; big?: boolean; accent?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`font-extrabold ${accent ?? "text-slate-900"} ${big ? "text-2xl" : "text-xl"}`}>{valor}</p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}
