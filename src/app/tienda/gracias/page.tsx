import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";

export const dynamic = "force-dynamic";

export default async function GraciasPage({ searchParams }: { searchParams: Promise<{ pedido?: string }> }) {
  const { pedido: pedidoId } = await searchParams;
  const pedido = pedidoId
    ? await prisma.pedido.findUnique({ where: { id: pedidoId }, include: { items: { include: { producto: true } } } })
    : null;
  const total = pedido ? pedido.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0) : 0;

  return (
    <div className="min-h-screen bg-crema">
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-verde/15 text-3xl">✅</div>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-choco">¡Pedido enviado!</h1>
        <p className="mt-1 text-sm text-choco-2">Lo recibimos y te contactaremos para confirmar el pago y la entrega.</p>

        {pedido && (
          <div className="mt-5 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-crema-2">
            <p className="text-xs font-bold uppercase tracking-wide text-choco-2">Tu pedido</p>
            <ul className="mt-1 divide-y divide-crema-2 text-sm">
              {pedido.items.map((it) => (
                <li key={it.id} className="flex justify-between py-1.5">
                  <span className="text-choco">{it.cantidad}× {it.producto.nombre}</span>
                  <span className="font-semibold text-choco">{fmtCLP(Number(it.precioUnit) * it.cantidad)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t-2 border-crema-2 pt-2 font-extrabold text-choco">
              <span>Total</span><span>{fmtCLP(total)}</span>
            </div>
            <p className="mt-2 text-xs text-choco-2">{pedido.tipoEntrega === "delivery" ? "🛵 Despacho a domicilio" : "🏪 Retiro en local"}{pedido.notas ? ` · ${pedido.notas}` : ""}</p>
          </div>
        )}

        <Link href="/tienda" className="mt-6 inline-block rounded-full bg-azul px-6 py-3 text-sm font-bold text-white active:scale-95">← Volver a la tienda</Link>
      </div>
    </div>
  );
}
