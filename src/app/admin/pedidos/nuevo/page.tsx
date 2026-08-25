import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CANALES_PEDIDO, canalPedidoLabel, ENTREGAS_PEDIDO, entregaPedidoLabel } from "@/lib/dominio/pedidos";
import { tipoClienteLabel, TIPOS_CLIENTE } from "@/lib/dominio/precios";
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
          Tipo de cliente <span className="font-normal text-slate-400">(fija los precios)</span>
          <select name="tipoCliente" defaultValue="consumidor" className={inputCls}>
            {TIPOS_CLIENTE.map((t) => <option key={t} value={t}>{tipoClienteLabel[t] ?? t}</option>)}
          </select>
        </label>

        <label className="mt-4 block text-sm font-bold text-slate-700">
          Cliente <span className="font-normal text-slate-400">(opcional — si es de la base, usa sus precios)</span>
          <select name="negocioId" defaultValue="" className={inputCls}>
            <option value="">— sin cliente (mostrador) —</option>
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

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-bold text-slate-700">
            Entrega
            <select name="tipoEntrega" defaultValue="local" className={inputCls}>
              {ENTREGAS_PEDIDO.map((e) => <option key={e} value={e}>{entregaPedidoLabel[e]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">
            Despachar a <span className="font-normal text-slate-400">(retiro/delivery)</span>
            <select name="destino" defaultValue="" className={inputCls}>
              <option value="">— no despachar —</option>
              <option value="bodega">📦 Bodega</option>
              <option value="local">🏪 Local</option>
              <option value="reparto">🛵 Reparto</option>
            </select>
          </label>
        </div>

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
