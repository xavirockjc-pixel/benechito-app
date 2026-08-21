import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import {
  MEDIOS_PAGO,
  medioPagoLabel,
  estadoPagoLabel,
  estadoPagoColor,
  DOCUMENTOS,
  documentoLabel,
} from "@/lib/dominio/ventas";
import { registrarPago, eliminarPago, asignarDocumento, eliminarVenta } from "../actions";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export default async function FichaVenta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const venta = await prisma.venta.findUnique({
    where: { id },
    include: {
      negocio: true,
      ubicacion: true,
      pagos: { orderBy: { fecha: "desc" } },
      pedido: { include: { items: { include: { producto: true } } } },
    },
  });
  if (!venta) notFound();

  const total = Number(venta.total);
  const pagado = venta.pagos.reduce((s, p) => s + Number(p.monto), 0);
  const saldo = total - pagado;
  const c = estadoPagoColor[venta.estadoPago];

  return (
    <div>
      <Link href="/admin/ventas" className="text-sm font-semibold text-naranja">
        ← Ventas
      </Link>

      {/* Encabezado */}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {venta.negocio.nombreNegocio ?? venta.negocio.nombreContacto}
          </h1>
          <p className="text-sm text-slate-500">
            {fmtHora(venta.fecha)} · {venta.ubicacion.nombre}
            {venta.pedido ? (
              <>
                {" · "}
                <Link href={`/admin/pedidos/${venta.pedido.id}`} className="text-naranja">
                  ver pedido
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <span className="rounded-md px-3 py-1.5 text-sm font-bold" style={{ color: c?.color, backgroundColor: c?.bg }}>
          {estadoPagoLabel[venta.estadoPago] ?? venta.estadoPago}
        </span>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Detalle de la venta */}
        <div className="lg:col-span-2 space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Detalle</h2>
            {venta.pedido && venta.pedido.items.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2">Producto</th>
                    <th className="py-2 text-right">Precio</th>
                    <th className="py-2 text-center">Cant.</th>
                    <th className="py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {venta.pedido.items.map((it) => (
                    <tr key={it.id}>
                      <td className="py-2 font-semibold text-slate-800">{it.producto.nombre}</td>
                      <td className="py-2 text-right text-slate-600">{fmtCLP(Number(it.precioUnit))}</td>
                      <td className="py-2 text-center text-slate-600">{it.cantidad}</td>
                      <td className="py-2 text-right font-semibold text-slate-900">
                        {fmtCLP(Number(it.precioUnit) * it.cantidad)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={3} className="py-3 text-right font-bold text-slate-700">Total</td>
                    <td className="py-3 text-right text-lg font-extrabold text-slate-900">{fmtCLP(total)}</td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <p className="text-sm text-slate-500">
                Venta directa por {fmtCLP(total)} (sin pedido asociado).
              </p>
            )}
          </section>

          {/* Pagos */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Pagos</h2>
              <div className="text-right text-sm">
                <span className="text-slate-500">Saldo: </span>
                <span className={`font-extrabold ${saldo > 0 ? "text-amber-600" : "text-green-600"}`}>
                  {fmtCLP(saldo)}
                </span>
              </div>
            </div>

            {venta.pagos.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Sin abonos registrados.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 text-sm">
                {venta.pagos.map((p) => (
                  <li key={p.id} className="flex items-center justify-between py-2">
                    <span className="text-slate-700">
                      {medioPagoLabel[p.medio] ?? p.medio}{" "}
                      <span className="text-slate-400">· {fmtHora(p.fecha)}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold text-slate-900">{fmtCLP(Number(p.monto))}</span>
                      <form action={eliminarPago}>
                        <input type="hidden" name="pagoId" value={p.id} />
                        <input type="hidden" name="ventaId" value={venta.id} />
                        <button className="text-xs font-semibold text-rojo/60 hover:text-rojo">quitar</button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {saldo > 0 && (
              <form action={registrarPago} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <input type="hidden" name="ventaId" value={venta.id} />
                <label className="text-sm font-bold text-slate-700">Medio
                  <select name="medio" required defaultValue="efectivo" className={`mt-1 ${inputCls}`}>
                    {MEDIOS_PAGO.map((m) => <option key={m} value={m}>{medioPagoLabel[m]}</option>)}
                  </select>
                </label>
                <label className="text-sm font-bold text-slate-700">Monto
                  <input type="number" name="monto" min="1" step="1" defaultValue={saldo} inputMode="numeric" className={`mt-1 ${inputCls}`} />
                </label>
                <button className="rounded-lg bg-naranja px-4 py-2 text-sm font-bold text-white transition hover:brightness-105">
                  Registrar pago
                </button>
              </form>
            )}
          </section>
        </div>

        {/* Documento + eliminar */}
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-bold text-slate-900">Documento tributario</h2>
            <form action={asignarDocumento} className="flex items-end gap-2">
              <input type="hidden" name="ventaId" value={venta.id} />
              <select name="documento" defaultValue={venta.documento ?? ""} className={inputCls}>
                {DOCUMENTOS.map((d) => <option key={d} value={d}>{documentoLabel[d]}</option>)}
              </select>
              <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700">
                Guardar
              </button>
            </form>
            <p className="mt-2 text-xs text-slate-400">
              La emisión electrónica (SII) se integrará con un proveedor; aquí se registra la relación.
            </p>
          </section>

          <form action={eliminarVenta}>
            <input type="hidden" name="ventaId" value={venta.id} />
            <button className="text-sm font-semibold text-rojo/70 hover:text-rojo">Eliminar venta</button>
          </form>
        </div>
      </div>
    </div>
  );
}
