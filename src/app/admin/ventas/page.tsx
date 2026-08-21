import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { estadoPagoLabel, estadoPagoColor } from "@/lib/dominio/ventas";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });

export default async function VentasPage() {
  const ventas = await prisma.venta.findMany({
    orderBy: { fecha: "desc" },
    include: {
      negocio: { select: { nombreNegocio: true, nombreContacto: true } },
      pagos: { select: { monto: true } },
    },
  });

  const totalVendido = ventas.reduce((s, v) => s + Number(v.total), 0);
  const totalPorCobrar = ventas.reduce((s, v) => {
    const pagado = v.pagos.reduce((a, p) => a + Number(p.monto), 0);
    return s + Math.max(0, Number(v.total) - pagado);
  }, 0);

  return (
    <div>
      <h1 className="text-2xl font-extrabold text-slate-900">Ventas</h1>
      <p className="text-sm text-slate-500">
        Una venta es el hecho económico. El pago se registra aparte; el estado de pago se calcula solo.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Vendido</p>
          <p className="text-lg font-extrabold text-slate-900">{fmtCLP(totalVendido)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3">
          <p className="text-xs uppercase tracking-wide text-slate-500">Por cobrar</p>
          <p className="text-lg font-extrabold text-amber-600">{fmtCLP(totalPorCobrar)}</p>
        </div>
      </div>

      {ventas.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Aún no hay ventas. Se generan desde un pedido con productos (botón “Generar venta”).
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Pagado</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ventas.map((v) => {
                const pagado = v.pagos.reduce((a, p) => a + Number(p.monto), 0);
                const saldo = Number(v.total) - pagado;
                const c = estadoPagoColor[v.estadoPago];
                return (
                  <tr key={v.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/ventas/${v.id}`} className="font-semibold text-slate-900 hover:text-naranja">
                        {v.negocio.nombreNegocio ?? v.negocio.nombreContacto}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtCLP(Number(v.total))}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmtCLP(pagado)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmtCLP(saldo)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md px-2 py-1 text-xs font-bold" style={{ color: c?.color, backgroundColor: c?.bg }}>
                        {estadoPagoLabel[v.estadoPago] ?? v.estadoPago}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmtFecha(v.fecha)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
