import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { crearDeuda, abonarDeudaPropia, eliminarDeuda, registrarGastoPersonal } from "./actions";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const fdia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

export default async function EstadoFinancieroPage() {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);

  const [sumaVentas, sumaPagos, deudas, gastosMes] = await Promise.all([
    prisma.venta.aggregate({ _sum: { total: true } }),
    prisma.pago.aggregate({ _sum: { monto: true } }),
    prisma.deuda.findMany({ where: { estado: "pendiente" }, orderBy: [{ fechaVence: "asc" }, { createdAt: "desc" }] }),
    prisma.gasto.findMany({ where: { fecha: { gte: inicioMes } }, orderBy: { fecha: "desc" } }),
  ]);

  // Te deben (clientes)
  const porCobrar = Math.max(0, num(sumaVentas._sum.total) - num(sumaPagos._sum.monto));

  // Debes (deudas propias)
  const saldo = (d: { monto: unknown; pagado: unknown }) => num(d.monto) - num(d.pagado);
  const debesTrabajo = deudas.filter((d) => !d.personal).reduce((s, d) => s + saldo(d), 0);
  const debesPersonal = deudas.filter((d) => d.personal).reduce((s, d) => s + saldo(d), 0);
  const debesTotal = debesTrabajo + debesPersonal;
  const balance = porCobrar - debesTotal;

  // Gastos del mes: trabajo vs personal (fuera del trabajo)
  const gastoTrabajo = gastosMes.filter((g) => !g.personal).reduce((s, g) => s + num(g.monto), 0);
  const gastoPersonal = gastosMes.filter((g) => g.personal).reduce((s, g) => s + num(g.monto), 0);
  const personales = gastosMes.filter((g) => g.personal).slice(0, 12);

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">📋 Estado financiero</h1>
        <p className="text-sm text-slate-500">Lo que te deben, lo que debes, y tus gastos del trabajo vs personales.</p>
      </div>

      {/* Balance */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Te deben (clientes)" valor={CLP(porCobrar)} color="#2f9e44" />
        <Kpi label="Debes (trabajo)" valor={CLP(debesTrabajo)} color="#e23b2c" />
        <Kpi label="Debes (personal)" valor={CLP(debesPersonal)} color="#b45309" />
        <Kpi label="Balance neto" valor={CLP(balance)} color={balance >= 0 ? "#15803d" : "#b91c1c"} sub={balance >= 0 ? "a favor" : "en contra"} />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
        <b>Balance neto</b> = te deben − lo que debes. Es una foto simple de tu posición; el detalle mensual de ingresos/egresos está en <Link href="/admin/panorama" className="font-semibold text-slate-700 underline">Panorama</Link>.
      </div>

      {/* Deudas por pagar */}
      <h2 className="mt-6 mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">💳 Deudas por pagar</h2>
      {deudas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">Sin deudas pendientes. 🎉</p>
      ) : (
        <ul className="space-y-2">
          {deudas.map((d) => (
            <li key={d.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {d.acreedor}
                    <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold ${d.personal ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                      {d.personal ? "personal" : "trabajo"}
                    </span>
                  </p>
                  <p className="truncate text-[11px] text-slate-400">
                    {d.motivo ? `${d.motivo} · ` : ""}Saldo {CLP(saldo(d))} de {CLP(num(d.monto))}
                    {d.fechaVence ? ` · vence ${fdia(d.fechaVence)}` : ""}
                  </p>
                </div>
                <form action={eliminarDeuda}><input type="hidden" name="id" value={d.id} /><button className="text-xs text-slate-400 hover:text-red-500">✕</button></form>
              </div>
              <form action={abonarDeudaPropia} className="mt-2 flex items-center gap-2">
                <input type="hidden" name="id" value={d.id} />
                <input name="abono" inputMode="numeric" placeholder="Abonar $" className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white active:brightness-110">Registrar abono</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* Nueva deuda */}
      <details className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-extrabold text-slate-800">➕ Registrar una deuda</summary>
        <form action={crearDeuda} className="mt-3 grid grid-cols-2 gap-2">
          <input name="acreedor" required placeholder="¿A quién le debes?" className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="motivo" placeholder="Motivo (opcional)" className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="monto" inputMode="numeric" required placeholder="Monto $" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input type="date" name="fechaVence" className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600" />
          <label className="col-span-2 flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" name="personal" value="1" className="h-4 w-4" /> Es una deuda <b>personal</b> (fuera del trabajo)
          </label>
          <button className="col-span-2 rounded-xl bg-slate-900 py-2.5 text-sm font-extrabold text-white active:brightness-110">Guardar deuda</button>
        </form>
      </details>

      {/* Gastos: trabajo vs personal */}
      <h2 className="mt-6 mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">🧾 Gastos del mes</h2>
      <div className="grid grid-cols-2 gap-3">
        <Kpi label="Del trabajo" valor={CLP(gastoTrabajo)} color="#1479c4" />
        <Kpi label="Personales (fuera del trabajo)" valor={CLP(gastoPersonal)} color="#b45309" />
      </div>

      {/* Registrar gasto personal */}
      <details className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-extrabold text-amber-800">➕ Registrar gasto personal (fuera del trabajo)</summary>
        <form action={registrarGastoPersonal} className="mt-3 grid grid-cols-2 gap-2">
          <input name="concepto" required placeholder="Ej: bencina auto, mercado" className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="monto" inputMode="numeric" required placeholder="Monto $" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="categoria" placeholder="Categoría (opcional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <button className="col-span-2 rounded-xl bg-[#b45309] py-2.5 text-sm font-extrabold text-white active:brightness-110">Guardar gasto personal</button>
        </form>
      </details>

      {personales.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white p-2 text-sm shadow-sm">
          {personales.map((g) => (
            <li key={g.id} className="flex items-center justify-between px-2 py-1.5">
              <span className="min-w-0 truncate text-slate-700">{g.concepto} <span className="text-[11px] text-slate-400">· {fdia(g.fecha)}</span></span>
              <span className="shrink-0 font-bold text-slate-800 tabular-nums">{CLP(num(g.monto))}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-center text-[11px] text-slate-400">📊 Estimación de gestión. Los gastos personales NO se mezclan con los del negocio en Panorama.</p>
    </div>
  );
}

function Kpi({ label, valor, sub, color }: { label: string; valor: string; sub?: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="truncate text-base font-extrabold text-slate-900 tabular-nums" title={valor}>{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      {sub && <p className="text-[10px] font-bold" style={{ color }}>{sub}</p>}
    </div>
  );
}
