import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { rangoPeriodo } from "@/lib/dominio/sueldos";
import { registrarFlete, eliminarFlete } from "./actions";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

export default async function BalanceRutaPage({ searchParams }: { searchParams: Promise<{ periodo?: string; off?: string }> }) {
  const sp = await searchParams;
  const periodo = sp.periodo === "mes" ? "mes" : "semana";
  const off = Number.isFinite(Number(sp.off)) ? parseInt(sp.off ?? "0", 10) : 0;
  const { inicio, fin, label, esSemana } = rangoPeriodo(periodo, off);
  const rango = { gte: inicio, lt: fin };

  const [ventasRuta, fletesAgg, bencinaAgg, otrosVehAgg, pagosAgg, fletes] = await Promise.all([
    prisma.venta.aggregate({ _sum: { total: true }, _count: true, where: { vendedorId: { not: null }, fecha: rango } }),
    prisma.flete.aggregate({ _sum: { monto: true }, _count: true, where: { fecha: rango } }),
    prisma.gastoVehiculo.aggregate({ _sum: { monto: true }, where: { tipo: "combustible", fecha: rango } }),
    prisma.gastoVehiculo.aggregate({ _sum: { monto: true }, where: { tipo: { not: "combustible" }, fecha: rango } }),
    prisma.movimientoTrabajador.aggregate({ _sum: { monto: true }, where: { tipo: "pago", fecha: rango, trabajador: { cargo: { in: ["vendedor", "repartidor"] } } } }),
    prisma.flete.findMany({ where: { fecha: rango }, orderBy: { fecha: "desc" } }),
  ]);

  const iVentas = num(ventasRuta._sum.total);
  const iFletes = num(fletesAgg._sum.monto);
  const ingresos = iVentas + iFletes;

  const cBencina = num(bencinaAgg._sum.monto);
  const cOtros = num(otrosVehAgg._sum.monto);
  const cPagos = num(pagosAgg._sum.monto);
  const costos = cBencina + cOtros + cPagos;

  const balance = ingresos - costos;
  const positivo = balance >= 0;

  const qs = (patch: { periodo?: string; off?: number }) => `/admin/balance-ruta?periodo=${patch.periodo ?? periodo}&off=${patch.off ?? off}`;

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">🚚 Balance de reparto</h1>
        <p className="text-sm text-slate-500">Lo que entró en ruta menos lo que costó (repartidor + bencina + otros). Para saber si ganas o pierdes.</p>
      </div>

      {/* Período */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <Link href={qs({ periodo: "semana", off: 0 })} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${esSemana ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-600"}`}>Semana</Link>
        <Link href={qs({ periodo: "mes", off: 0 })} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${!esSemana ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-600"}`}>Mes</Link>
      </div>
      <div className="mt-2 flex items-center justify-center gap-3">
        <Link href={qs({ off: off - 1 })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">←</Link>
        <span className="min-w-[11rem] text-center text-sm font-extrabold capitalize text-slate-800">{label}</span>
        <Link href={qs({ off: off + 1 })} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">→</Link>
      </div>

      {/* Balance grande */}
      <div className="mt-4 rounded-2xl border-2 p-5 text-center shadow-sm" style={{ borderColor: positivo ? "#86efac" : "#fca5a5", background: positivo ? "#f0fdf4" : "#fef2f2" }}>
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Balance del período</p>
        <p className="text-4xl font-extrabold tabular-nums" style={{ color: positivo ? "#15803d" : "#b91c1c" }}>{positivo ? "" : "−"}{CLP(Math.abs(balance))}</p>
        <p className="mt-1 text-sm font-bold" style={{ color: positivo ? "#15803d" : "#b91c1c" }}>{positivo ? "🟢 Vas ganando" : "🔴 Vas perdiendo"}</p>
      </div>

      {/* Ingresos vs Costos */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-emerald-600">↑ Entró (ingresos)</h2>
          <Linea label={`Ventas en ruta (${ventasRuta._count})`} valor={iVentas} />
          <Linea label={`Fletes cobrados (${fletesAgg._count})`} valor={iFletes} />
          <Total label="Total ingresos" valor={ingresos} color="#15803d" />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-rose-600">↓ Salió (costos)</h2>
          <Linea label="Pago al repartidor/vendedor" valor={cPagos} />
          <Linea label="Bencina / combustible" valor={cBencina} />
          <Linea label="Otros (mantención, desgaste…)" valor={cOtros} />
          <Total label="Total costos" valor={costos} color="#b91c1c" />
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
        💡 Ingresos = ventas hechas por vendedores en terreno + fletes. Costos = pagos a vendedores/repartidores + bencina + otros gastos de vehículo. Cámbialo entre semana y mes arriba.
      </p>

      {/* Fletes */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-extrabold text-slate-800">📦 Fletes cobrados</h2>
        <form action={registrarFlete} className="mt-3 flex flex-wrap items-end gap-2">
          <input name="monto" inputMode="numeric" placeholder="Monto $" required className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <input name="destino" placeholder="Distribuidor / destino" className="min-w-[9rem] flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <input type="date" name="fecha" className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <button className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">+ Registrar flete</button>
        </form>
        {fletes.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {fletes.map((f) => (
              <li key={f.id} className="flex items-center gap-2 text-sm">
                <span className="font-bold text-slate-800 tabular-nums">{CLP(num(f.monto))}</span>
                <span className="flex-1 truncate text-slate-500">{f.destino ?? "—"} · {fmtDia(f.fecha)}</span>
                <form action={eliminarFlete}><input type="hidden" name="id" value={f.id} /><button className="text-xs text-slate-400 hover:text-red-500">✕</button></form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Linea({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-1.5 text-sm">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-800 tabular-nums">{CLP(valor)}</span>
    </div>
  );
}

function Total({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="mt-2 flex items-center justify-between">
      <span className="text-sm font-extrabold text-slate-700">{label}</span>
      <span className="text-lg font-extrabold tabular-nums" style={{ color }}>{CLP(valor)}</span>
    </div>
  );
}
