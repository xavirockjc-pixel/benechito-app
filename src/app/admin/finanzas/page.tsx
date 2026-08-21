import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { MEDIOS_PAGO, medioPagoLabel } from "@/lib/dominio/ventas";
import { registrarGasto, eliminarGasto, abonarDeuda } from "./actions";

export const dynamic = "force-dynamic";

const hoyISO = () => new Date().toISOString().slice(0, 10);
const fmtFecha = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
const diasDesde = (d: Date) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
const inputCls = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-500";
const CATEGORIAS = ["insumos", "sueldos", "arriendo", "transporte", "servicios", "otros"];

export default async function FinanzasPage() {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [pagosMes, gastosMes, gastos, ventasAbiertas] = await Promise.all([
    prisma.pago.aggregate({ _sum: { monto: true }, where: { fecha: { gte: inicioMes } } }),
    prisma.gasto.aggregate({ _sum: { monto: true }, where: { fecha: { gte: inicioMes } } }),
    prisma.gasto.findMany({ orderBy: { fecha: "desc" }, take: 15 }),
    prisma.venta.findMany({
      where: { estadoPago: { in: ["pendiente", "parcial", "vencido"] } },
      include: { pagos: { select: { monto: true } }, negocio: { select: { id: true, nombreNegocio: true, nombreContacto: true } } },
      orderBy: { fecha: "asc" },
    }),
  ]);

  const cobradoMes = Number(pagosMes._sum.monto ?? 0);
  const gastoMes = Number(gastosMes._sum.monto ?? 0);
  const flujoMes = cobradoMes - gastoMes;

  // Cuentas por cobrar: agrupar por cliente
  const deudaPorCliente = new Map<string, { nombre: string; saldo: number; masAntigua: Date }>();
  for (const v of ventasAbiertas) {
    const saldo = Number(v.total) - v.pagos.reduce((s, p) => s + Number(p.monto), 0);
    if (saldo <= 0) continue;
    const nombre = v.negocio.nombreNegocio ?? v.negocio.nombreContacto;
    const prev = deudaPorCliente.get(v.negocio.id);
    if (prev) {
      prev.saldo += saldo;
      if (v.fecha < prev.masAntigua) prev.masAntigua = v.fecha;
    } else {
      deudaPorCliente.set(v.negocio.id, { nombre, saldo, masAntigua: v.fecha });
    }
  }
  const deudores = [...deudaPorCliente.entries()].map(([id, d]) => ({ id, ...d })).sort((a, b) => b.saldo - a.saldo);
  const porCobrarTotal = deudores.reduce((s, d) => s + d.saldo, 0);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">Finanzas</h1>
      <p className="text-sm text-slate-500">Ingresos, gastos y lo que te deben (fiado).</p>

      {/* KPIs del mes */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Cobrado (mes)" valor={fmtCLP(cobradoMes)} color="text-green-600" />
        <Kpi label="Gastos (mes)" valor={fmtCLP(gastoMes)} color="text-red-600" />
        <Kpi label="Flujo neto (mes)" valor={fmtCLP(flujoMes)} color={flujoMes >= 0 ? "text-slate-900" : "text-red-600"} />
        <Kpi label="Por cobrar (total)" valor={fmtCLP(porCobrarTotal)} color="text-amber-600" />
      </div>

      {/* Cuentas por cobrar */}
      <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">Cuentas por cobrar</h2>
      {deudores.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Nadie te debe. Todo cobrado. 🎉
        </p>
      ) : (
        <div className="space-y-2">
          {deudores.map((d) => {
            const dias = diasDesde(d.masAntigua);
            return (
              <div key={d.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link href={`/admin/negocios/${d.id}`} className="font-bold text-slate-900 hover:text-naranja">{d.nombre}</Link>
                    <p className="text-xs text-slate-500">Desde hace {dias} día{dias === 1 ? "" : "s"}</p>
                  </div>
                  <span className="text-lg font-extrabold text-red-600">{fmtCLP(d.saldo)}</span>
                </div>
                <form action={abonarDeuda} className="mt-2 flex items-end gap-2">
                  <input type="hidden" name="negocioId" value={d.id} />
                  <label className="text-xs font-bold text-slate-600">Medio
                    <select name="medio" defaultValue="efectivo" className={`mt-1 block ${inputCls}`}>
                      {MEDIOS_PAGO.filter((m) => m !== "credito").map((m) => <option key={m} value={m}>{medioPagoLabel[m]}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-600">Monto
                    <input type="number" name="monto" min="1" step="1" defaultValue={d.saldo} inputMode="numeric" className={`mt-1 block w-28 ${inputCls}`} />
                  </label>
                  <button className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white">Abonar</button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      {/* Gastos */}
      <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">Gastos</h2>
      <form action={registrarGasto} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-bold text-slate-700 lg:col-span-2">Concepto
            <input name="concepto" required placeholder="Ej: Compra de leche" className={`mt-1 block w-full ${inputCls}`} />
          </label>
          <label className="text-sm font-bold text-slate-700">Monto
            <input type="number" name="monto" min="1" step="1" required inputMode="numeric" className={`mt-1 block w-full ${inputCls}`} />
          </label>
          <label className="text-sm font-bold text-slate-700">Categoría
            <select name="categoria" defaultValue="insumos" className={`mt-1 block w-full ${inputCls}`}>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold text-slate-700">Fecha
            <input type="date" name="fecha" defaultValue={hoyISO()} className={`mt-1 block w-full ${inputCls}`} />
          </label>
        </div>
        <button className="mt-4 rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">Registrar gasto</button>
      </form>

      {gastos.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
          {gastos.map((g) => (
            <li key={g.id} className="flex items-center justify-between gap-2 px-4 py-2">
              <span className="text-slate-700">
                {g.concepto} <span className="text-xs text-slate-400">· {g.categoria ?? "—"} · {fmtFecha(g.fecha)}</span>
              </span>
              <span className="flex items-center gap-3">
                <span className="font-semibold text-red-600">{fmtCLP(Number(g.monto))}</span>
                <form action={eliminarGasto}>
                  <input type="hidden" name="id" value={g.id} />
                  <button className="text-xs text-rojo/50 hover:text-rojo">✕</button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className={`text-xl font-extrabold ${color}`}>{valor}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
