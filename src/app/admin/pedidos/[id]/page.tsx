import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  ESTADOS_PEDIDO,
  estadoPedidoLabel,
  estadoPedidoColor,
  canalPedidoLabel,
  fmtCLP,
} from "@/lib/dominio/pedidos";
import { listaParaCliente, tipoClienteLabel } from "@/lib/dominio/precios";
import { agregarItem, quitarItem, cambiarEstadoPedido, eliminarPedido } from "../actions";
import { generarVenta } from "../../ventas/actions";

export const dynamic = "force-dynamic";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export default async function FichaPedido({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pedido = await prisma.pedido.findUnique({
    where: { id },
    include: {
      negocio: true,
      items: { include: { producto: true }, orderBy: { producto: { nombre: "asc" } } },
      venta: { select: { id: true } },
    },
  });
  if (!pedido) notFound();

  const [productos, listaId] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    listaParaCliente(pedido.negocioId),
  ]);
  const lista = listaId
    ? await prisma.listaPrecio.findUnique({ where: { id: listaId }, select: { nombre: true } })
    : null;

  const total = pedido.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0);
  const c = estadoPedidoColor[pedido.estado];

  return (
    <div>
      <Link href="/admin/pedidos" className="text-sm font-semibold text-naranja">
        ← Pedidos
      </Link>

      {/* Encabezado */}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {pedido.negocio.nombreNegocio ?? pedido.negocio.nombreContacto}
          </h1>
          <p className="text-sm text-slate-500">
            {tipoClienteLabel[pedido.negocio.tipoCliente] ?? pedido.negocio.tipoCliente} ·{" "}
            Canal: {canalPedidoLabel[pedido.canal] ?? pedido.canal} ·{" "}
            Lista: {lista?.nombre ?? "automática"}
          </p>
        </div>
        <span
          className="rounded-md px-3 py-1.5 text-sm font-bold"
          style={{ color: c?.color, backgroundColor: c?.bg }}
        >
          {estadoPedidoLabel[pedido.estado] ?? pedido.estado}
        </span>
      </div>

      {/* Cambio de estado */}
      <form action={cambiarEstadoPedido} className="mt-4 flex flex-wrap items-center gap-2">
        <input type="hidden" name="pedidoId" value={pedido.id} />
        <select name="estado" defaultValue={pedido.estado} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-slate-500">
          {ESTADOS_PEDIDO.map((e) => (
            <option key={e} value={e}>{estadoPedidoLabel[e]}</option>
          ))}
        </select>
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700">
          Actualizar estado
        </button>
        <span className="text-xs text-slate-400">El estado del pedido no afecta al pago.</span>
      </form>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Líneas del pedido */}
        <div className="lg:col-span-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Productos del pedido</h2>

            {pedido.items.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay productos. Agrégalos abajo.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2">Producto</th>
                    <th className="py-2 text-right">Precio</th>
                    <th className="py-2 text-center">Cant.</th>
                    <th className="py-2 text-right">Subtotal</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pedido.items.map((it) => {
                    const precio = Number(it.precioUnit);
                    return (
                      <tr key={it.id}>
                        <td className="py-2 font-semibold text-slate-800">
                          {it.producto.nombre}
                          {precio === 0 && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              sin precio en la lista
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right text-slate-600">{fmtCLP(precio)}</td>
                        <td className="py-2 text-center text-slate-600">{it.cantidad}</td>
                        <td className="py-2 text-right font-semibold text-slate-900">
                          {fmtCLP(precio * it.cantidad)}
                        </td>
                        <td className="py-2 text-right">
                          <form action={quitarItem}>
                            <input type="hidden" name="itemId" value={it.id} />
                            <input type="hidden" name="pedidoId" value={pedido.id} />
                            <button className="text-xs font-semibold text-rojo/70 hover:text-rojo">
                              Quitar
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-200">
                    <td colSpan={3} className="py-3 text-right font-bold text-slate-700">Total</td>
                    <td className="py-3 text-right text-lg font-extrabold text-slate-900">{fmtCLP(total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </section>
        </div>

        {/* Agregar producto */}
        <div>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Agregar producto</h2>
            <form action={agregarItem} className="space-y-3">
              <input type="hidden" name="pedidoId" value={pedido.id} />
              <label className="block text-sm font-bold text-slate-700">
                Producto
                <select name="productoId" required defaultValue="" className={`mt-1 ${inputCls}`}>
                  <option value="">Selecciona…</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}{p.formato ? ` · ${p.formato}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-bold text-slate-700">
                Cantidad
                <input
                  type="number"
                  name="cantidad"
                  min="1"
                  step="1"
                  defaultValue="1"
                  inputMode="numeric"
                  className={`mt-1 ${inputCls}`}
                />
              </label>
              <button className="w-full rounded-lg bg-naranja px-4 py-2 text-sm font-bold text-white transition hover:brightness-105">
                Agregar
              </button>
              <p className="text-xs text-slate-400">
                El precio se toma de la lista <strong>{lista?.nombre ?? "automática"}</strong> del cliente.
              </p>
            </form>
          </section>

          {/* Venta asociada */}
          <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-sm font-bold text-slate-900">Venta</h2>
            {pedido.venta ? (
              <Link
                href={`/admin/ventas/${pedido.venta.id}`}
                className="inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:brightness-105"
              >
                Ver venta →
              </Link>
            ) : pedido.items.length > 0 ? (
              <form action={generarVenta}>
                <input type="hidden" name="pedidoId" value={pedido.id} />
                <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:brightness-105">
                  Generar venta ({fmtCLP(total)})
                </button>
                <p className="mt-2 text-xs text-slate-400">Crea la venta y su cobro. El pedido sigue su propio estado.</p>
              </form>
            ) : (
              <p className="text-sm text-slate-500">Agrega productos para generar la venta.</p>
            )}
          </section>

          {pedido.notas && (
            <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-2 text-sm font-bold text-slate-900">Notas</h2>
              <p className="text-sm text-slate-600">{pedido.notas}</p>
            </section>
          )}

          <form action={eliminarPedido} className="mt-5">
            <input type="hidden" name="pedidoId" value={pedido.id} />
            <button className="text-sm font-semibold text-rojo/70 hover:text-rojo">
              Eliminar pedido
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
