import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";

export const dynamic = "force-dynamic";

const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "2-digit" });
const canalLabel: Record<string, string> = { local: "🏪 Local", terreno: "🚚 Ruta", directa: "Directa" };

/**
 * Historial de compras de un cliente: cuánto ha comprado, cada pedido con sus
 * productos y montos, y qué lleva más. Para ver su comportamiento de un vistazo.
 */
export default async function HistorialCliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cliente = await prisma.negocio.findUnique({
    where: { id },
    select: {
      id: true, nombreNegocio: true, comuna: true,
      ventas: {
        orderBy: { fecha: "desc" },
        include: { items: { select: { nombre: true, cantidad: true, precioUnit: true } }, pagos: { select: { monto: true } } },
      },
    },
  });
  if (!cliente) notFound();

  const ventas = cliente.ventas;
  const nCompras = ventas.length;
  const totalComprado = ventas.reduce((s, v) => s + Number(v.total), 0);
  const pagadoTotal = ventas.reduce((s, v) => s + v.pagos.reduce((a, p) => a + Number(p.monto), 0), 0);
  const deuda = totalComprado - pagadoTotal;
  const promedio = nCompras ? totalComprado / nCompras : 0;
  const ultima = ventas[0]?.fecha ?? null;

  // Productos que más lleva (por cantidad), de las líneas de detalle.
  const porProducto = new Map<string, { cantidad: number; monto: number }>();
  for (const v of ventas) for (const it of v.items) {
    const cur = porProducto.get(it.nombre) ?? { cantidad: 0, monto: 0 };
    cur.cantidad += it.cantidad;
    cur.monto += it.cantidad * Number(it.precioUnit);
    porProducto.set(it.nombre, cur);
  }
  const top = [...porProducto.entries()].sort((a, b) => b[1].cantidad - a[1].cantidad).slice(0, 6);

  return (
    <div className="mx-auto max-w-lg">
      <Link href={`/vendedor/cliente/${cliente.id}`} className="text-sm font-semibold text-[#1479c4]">← {cliente.nombreNegocio}</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">📊 Historial de compras</h1>
      <p className="text-xs text-slate-500">{cliente.comuna || "—"}</p>

      {nCompras === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Este cliente aún no tiene compras registradas.</p>
      ) : (
        <>
          {/* Resumen de comportamiento */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Resumen label="Total comprado" valor={fmtCLP(totalComprado)} />
            <Resumen label="Compras" valor={String(nCompras)} />
            <Resumen label="Promedio x compra" valor={fmtCLP(Math.round(promedio))} />
            <Resumen label="Última compra" valor={ultima ? fmtDia(ultima) : "—"} />
          </div>
          <div className={`mt-2 flex items-center justify-between rounded-xl px-3 py-2.5 ${deuda > 0 ? "bg-red-50" : "bg-green-50"}`}>
            <span className="text-sm font-semibold text-slate-600">{deuda > 0 ? "Debe ahora" : "Está al día"}</span>
            <span className={`text-lg font-extrabold ${deuda > 0 ? "text-red-600" : "text-green-600"}`}>{fmtCLP(Math.max(0, deuda))}</span>
          </div>

          {/* Qué lleva más */}
          {top.length > 0 && (
            <div className="mt-4">
              <h2 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">Lo que más lleva</h2>
              <div className="rounded-2xl border border-slate-200 bg-white">
                <ul className="divide-y divide-slate-100">
                  {top.map(([nombre, d]) => (
                    <li key={nombre} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate font-semibold text-slate-800">{nombre}</span>
                      <span className="shrink-0 text-slate-500">{d.cantidad} u. · <span className="font-bold text-slate-700">{fmtCLP(d.monto)}</span></span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Línea de tiempo de pedidos */}
          <h2 className="mb-1.5 mt-5 text-xs font-bold uppercase tracking-wide text-slate-500">Pedidos ({nCompras})</h2>
          <div className="space-y-2">
            {ventas.map((v) => {
              const pagado = v.pagos.reduce((a, p) => a + Number(p.monto), 0);
              const saldo = Number(v.total) - pagado;
              return (
                <div key={v.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500">{fmtDia(v.fecha)} · {canalLabel[v.canal] ?? v.canal}{v.etiqueta ? ` · ${v.etiqueta}` : ""}{v.documento === "factura" ? " · 🧾" : ""}</span>
                    <span className="shrink-0 text-sm font-extrabold text-slate-900">{fmtCLP(Number(v.total))}</span>
                  </div>
                  {v.items.length > 0 && (
                    <p className="mt-1 text-sm text-slate-700">{v.items.map((it) => `${it.cantidad}× ${it.nombre}`).join(" · ")}</p>
                  )}
                  <div className="mt-1 text-right">
                    {saldo > 0
                      ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">debe {fmtCLP(saldo)}</span>
                      : <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">pagado</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Resumen({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold text-slate-900">{valor}</p>
    </div>
  );
}
