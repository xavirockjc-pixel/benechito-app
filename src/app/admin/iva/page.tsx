import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { rangoMes, mesActualStr, sumarMes } from "@/lib/dominio/sueldos";
import { registrarCompra, eliminarCompra } from "./actions";
import CopiarBtn from "@/components/CopiarBtn";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

export default async function IvaPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : mesActualStr();
  const { inicio, fin, label } = rangoMes(mes);

  const [ventasDoc, compras] = await Promise.all([
    prisma.venta.aggregate({ _sum: { total: true }, _count: true, where: { documento: { in: ["boleta", "factura"] }, fecha: { gte: inicio, lt: fin } } }),
    prisma.gasto.findMany({ where: { fecha: { gte: inicio, lt: fin } }, orderBy: { fecha: "desc" } }),
  ]);

  const totalVentas = num(ventasDoc._sum.total);
  const ivaDebito = Math.round((totalVentas * 19) / 119);
  const netoVentas = totalVentas - ivaDebito;

  const comprasFactura = compras.filter((c) => c.conFactura);
  const ivaCredito = comprasFactura.reduce((s, c) => s + num(c.iva), 0);

  const resultado = ivaDebito - ivaCredito; // + a pagar / − remanente
  const aPagar = Math.max(0, resultado);
  const remanente = Math.max(0, -resultado);

  const exportTexto =
    `IVA ${label.toUpperCase()} — Benechito (ayuda F29, confirmar con contador)\n` +
    `Ventas con documento: ${CLP(totalVentas)} (neto ${CLP(netoVentas)})\n` +
    `IVA débito (ventas):   ${CLP(ivaDebito)}\n` +
    `IVA crédito (compras): ${CLP(ivaCredito)}  [${comprasFactura.length} factura(s)]\n` +
    `------------------------------------------\n` +
    (resultado >= 0 ? `IVA A PAGAR: ${CLP(aPagar)}` : `REMANENTE CRÉDITO: ${CLP(remanente)}`);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">🧾 Ayudante de IVA</h1>
          <p className="text-sm text-slate-500">Débito (ventas) − crédito (compras con factura) = lo que va al F29.</p>
        </div>
        <CopiarBtn texto={exportTexto} label="📋 Copiar para el contador" />
      </div>

      {/* Mes */}
      <div className="mt-4 flex items-center justify-center gap-3">
        <Link href={`/admin/iva?mes=${sumarMes(mes, -1)}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">←</Link>
        <span className="min-w-[10rem] text-center text-sm font-extrabold capitalize text-slate-800">{label}</span>
        <Link href={`/admin/iva?mes=${sumarMes(mes, 1)}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-50">→</Link>
      </div>

      {/* Resumen F29 */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Kpi label="IVA débito (ventas)" valor={CLP(ivaDebito)} color="#1479c4" />
        <Kpi label="IVA crédito (compras)" valor={CLP(ivaCredito)} color="#2f9e44" />
        <Kpi label={resultado >= 0 ? "IVA a pagar" : "Remanente a favor"} valor={CLP(resultado >= 0 ? aPagar : remanente)} color={resultado >= 0 ? "#e23b2c" : "#2f9e44"} />
      </div>

      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        ⚠️ <b>Ayuda, no reemplaza la declaración.</b> El débito se estima de tus ventas con boleta/factura (19/119). Registra tus <b>compras con factura</b> para descontar el crédito. El F29 se presenta en el SII; confírmalo con tu contador.
      </p>

      {/* Ventas del mes (resumen) */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-extrabold text-slate-800">💵 Ventas con documento</h2>
        <p className="mt-1 text-sm text-slate-600">{ventasDoc._count} venta(s) · total {CLP(totalVentas)} · neto {CLP(netoVentas)} · IVA {CLP(ivaDebito)}</p>
      </div>

      {/* Registrar compra con factura */}
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-extrabold text-slate-800">➕ Registrar compra / gasto</h2>
        <form action={registrarCompra} className="grid gap-2 sm:grid-cols-2">
          <input name="concepto" placeholder="Concepto (ej: cajas, insumos)" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="proveedor" placeholder="Proveedor (opcional)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <input name="total" inputMode="numeric" placeholder="Total pagado $ (con IVA)" required className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <select name="categoria" defaultValue="insumos" className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {["insumos", "arriendo", "transporte", "servicios", "otros"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" name="fecha" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" name="conFactura" defaultChecked className="h-4 w-4 accent-emerald-500" /> Con factura (tiene IVA crédito)</label>
          <button className="rounded-lg bg-slate-900 py-2 text-sm font-extrabold text-white sm:col-span-2">Guardar compra</button>
        </form>
      </div>

      {/* Compras del mes */}
      <div className="mt-4">
        <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">Compras del mes ({compras.length})</h2>
        {compras.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Sin compras registradas este mes.</p>
        ) : (
          <ul className="space-y-2">
            {compras.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{c.concepto} {c.proveedor && <span className="text-xs text-slate-400">· {c.proveedor}</span>}</p>
                  <p className="text-[11px] text-slate-400">{fmtDia(c.fecha)} · {c.categoria}{c.conFactura ? <span className="font-semibold text-emerald-600"> · con factura</span> : <span className="text-slate-400"> · sin factura</span>}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-slate-800 tabular-nums">{CLP(num(c.monto))}</p>
                  {c.conFactura && <p className="text-[11px] text-emerald-600 tabular-nums">IVA {CLP(num(c.iva))}</p>}
                </div>
                <form action={eliminarCompra}><input type="hidden" name="id" value={c.id} /><button className="text-xs text-slate-400 hover:text-red-500">✕</button></form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="text-lg font-extrabold text-slate-900 tabular-nums">{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
