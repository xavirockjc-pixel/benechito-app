import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * La venta por voz del administrador se quitó. La venta se registra en su sector:
 * Caja (local) o Vendedor (ruta). Esta página solo dirige al lugar correcto.
 */
export default function AdminVender() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🛒 Vender</h1>
      <p className="mt-1 text-sm text-slate-500">La venta se registra en su sector, para que el stock y los números cuadren por lugar.</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href="/caja/pos" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm active:bg-slate-50">
          <p className="text-3xl">🏪</p>
          <p className="mt-1 text-base font-extrabold text-slate-900">Caja (Local)</p>
          <p className="text-xs text-slate-500">Venta de la sala de ventas.</p>
        </Link>
        <Link href="/vendedor/venta-rapida" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm active:bg-slate-50">
          <p className="text-3xl">🚚</p>
          <p className="mt-1 text-base font-extrabold text-slate-900">Vendedor (Ruta)</p>
          <p className="text-xs text-slate-500">Venta en terreno / reparto.</p>
        </Link>
      </div>

      <div className="mt-4 flex gap-2">
        <Link href="/admin/pedidos/nuevo" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">➕ Pedido manual</Link>
        <Link href="/admin/precios" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700">Precios</Link>
      </div>
    </div>
  );
}
