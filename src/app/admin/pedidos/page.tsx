import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  estadoPedidoLabel,
  estadoPedidoColor,
  canalPedidoLabel,
  fmtCLP,
} from "@/lib/dominio/pedidos";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });

export default async function PedidosPage() {
  const pedidos = await prisma.pedido.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      negocio: { select: { nombreNegocio: true, nombreContacto: true } },
      items: { select: { cantidad: true, precioUnit: true } },
    },
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Pedidos</h1>
          <p className="text-sm text-slate-500">
            Intención de compra. El estado del pedido es independiente del pago.
          </p>
        </div>
        <Link
          href="/admin/pedidos/nuevo"
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-700"
        >
          + Nuevo pedido
        </Link>
      </div>

      {pedidos.length === 0 ? (
        <p className="mt-8 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Aún no hay pedidos. Crea el primero con “+ Nuevo pedido”.
        </p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Canal</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pedidos.map((p) => {
                const total = p.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0);
                const c = estadoPedidoColor[p.estado];
                return (
                  <tr key={p.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/pedidos/${p.id}`} className="font-semibold text-slate-900 hover:text-naranja">
                        {p.negocio.nombreNegocio ?? p.negocio.nombreContacto}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{canalPedidoLabel[p.canal] ?? p.canal}</td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded-md px-2 py-1 text-xs font-bold"
                        style={{ color: c?.color, backgroundColor: c?.bg }}
                      >
                        {estadoPedidoLabel[p.estado] ?? p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{fmtCLP(total)}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{fmtFecha(p.createdAt)}</td>
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
