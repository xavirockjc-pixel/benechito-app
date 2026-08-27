import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";

export const dynamic = "force-dynamic";

export default async function GraciasPage({ searchParams }: { searchParams: Promise<{ pedido?: string; status?: string; pago?: string }> }) {
  const { pedido: pedidoId, status, pago } = await searchParams;
  const pedido = pedidoId
    ? await prisma.pedido.findUnique({ where: { id: pedidoId }, include: { items: { include: { producto: true } } } })
    : null;
  const total = pedido ? pedido.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0) : 0;

  const pagado = Boolean(pedido?.pagado) || status === "approved";
  const falloPago = pago === "fallo" || status === "rejected" || status === "failure";
  const estado = pagado
    ? { icono: "✅", burbuja: "bg-verde/15", titulo: "¡Pago confirmado!", texto: "Recibimos tu pago y tu pedido. ¡Gracias!" }
    : falloPago
      ? { icono: "⚠️", burbuja: "bg-naranja/15", titulo: "Pedido tomado, pago pendiente", texto: "El pago no se completó, pero tu pedido quedó registrado. Te contactaremos para coordinarlo." }
      : { icono: "✅", burbuja: "bg-verde/15", titulo: "¡Pedido enviado!", texto: "Lo recibimos y te contactaremos para confirmar el pago y la entrega." };

  return (
    <div className="min-h-screen bg-crema">
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${estado.burbuja} text-3xl`}>{estado.icono}</div>
        <h1 className="mt-4 font-display text-2xl font-extrabold text-choco">{estado.titulo}</h1>
        <p className="mt-1 text-sm text-choco-2">{estado.texto}</p>

        {pedido && (
          <div className="mt-5 rounded-2xl bg-white p-4 text-left shadow-sm ring-1 ring-crema-2">
            <p className="text-xs font-bold uppercase tracking-wide text-choco-2">Tu pedido</p>
            <ul className="mt-1 divide-y divide-crema-2 text-sm">
              {pedido.items.map((it) => (
                <li key={it.id} className="flex justify-between py-1.5">
                  <span className="text-choco">{it.cantidad}× {it.producto.nombre}{it.sabor ? <span className="text-naranja"> · {it.sabor}</span> : ""}</span>
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
