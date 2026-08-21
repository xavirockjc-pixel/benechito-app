import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CANALES_PEDIDO, canalPedidoLabel } from "@/lib/dominio/pedidos";
import { tipoClienteLabel } from "@/lib/dominio/precios";
import { crearPedido } from "../actions";

export const dynamic = "force-dynamic";

const inputCls =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export default async function NuevoPedido() {
  const clientes = await prisma.negocio.findMany({
    orderBy: { nombreNegocio: "asc" },
    select: { id: true, nombreNegocio: true, nombreContacto: true, tipoCliente: true },
  });

  return (
    <div>
      <Link href="/admin/pedidos" className="text-sm font-semibold text-naranja">
        ← Pedidos
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Nuevo pedido</h1>
      <p className="text-sm text-slate-500">
        Elige el cliente y el canal. Luego agregas los productos y el precio se aplica solo según su lista.
      </p>

      <form
        action={crearPedido}
        className="mt-5 max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <label className="block text-sm font-bold text-slate-700">
          Cliente *
          <select name="negocioId" required defaultValue="" className={inputCls}>
            <option value="">Selecciona…</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombreNegocio ?? c.nombreContacto} · {tipoClienteLabel[c.tipoCliente] ?? c.tipoCliente}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-bold text-slate-700">
          Canal *
          <select name="canal" required defaultValue="" className={inputCls}>
            <option value="">Selecciona…</option>
            {CANALES_PEDIDO.map((c) => (
              <option key={c} value={c}>{canalPedidoLabel[c]}</option>
            ))}
          </select>
        </label>

        <label className="mt-4 block text-sm font-bold text-slate-700">
          Notas
          <textarea name="notas" rows={2} className={inputCls} />
        </label>

        <button className="mt-5 rounded-lg bg-slate-900 px-6 py-2.5 font-bold text-white shadow-sm transition hover:bg-slate-700">
          Crear y agregar productos
        </button>
      </form>

      {clientes.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          No hay clientes aún. Crea uno en <Link href="/admin/negocios" className="text-naranja">Clientes</Link>.
        </p>
      )}
    </div>
  );
}
