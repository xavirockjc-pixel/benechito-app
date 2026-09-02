import { prisma } from "@/lib/prisma";
import { estadoPedidoLabel, estadoPedidoColor } from "@/lib/dominio/pedidos";
import { cambiarEstadoPedido } from "@/app/admin/pedidos/actions";
import AutoRefrescar from "@/app/caja/pedidos/AutoRefrescar";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

export default async function MisEntregas() {
  const pedidos = await prisma.pedido.findMany({
    where: { tipoEntrega: { in: ["delivery", "despacho", "reparto"] }, estado: { notIn: ["entregado", "finalizado"] } },
    orderBy: [{ fechaAgenda: "asc" }, { createdAt: "asc" }],
    include: {
      negocio: { select: { nombreNegocio: true, whatsapp: true, latitud: true, longitud: true, direccion: true } },
      items: { include: { producto: { select: { nombre: true } } } },
    },
  });

  return (
    <div className="mx-auto max-w-lg">
      <AutoRefrescar />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">🛵 Mis entregas</h1>
          <p className="text-sm text-slate-500">Pedidos para despachar. Se actualiza solo.</p>
        </div>
        <span className="rounded-full bg-[#0f766e] px-3 py-1 text-sm font-extrabold text-white">{pedidos.length}</span>
      </div>

      {pedidos.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">✅ No hay entregas pendientes.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {pedidos.map((p) => {
            const c = estadoPedidoColor[p.estado] ?? { color: "#334155", bg: "#e2e8f0" };
            const totalPed = p.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0);
            const mapa = p.negocio?.latitud != null && p.negocio?.longitud != null ? `https://www.google.com/maps?q=${p.negocio.latitud},${p.negocio.longitud}` : "";
            const listo = p.estado === "listo";
            return (
              <li key={p.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${listo ? "border-[#0f766e] ring-2 ring-teal-100" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{p.negocio?.nombreNegocio ?? "Cliente"}</p>
                    <p className="text-xs text-slate-500">{p.negocio?.direccion ?? "sin dirección"}{p.fechaAgenda ? ` · 📅 ${fmtHora(p.fechaAgenda)}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: c.color, backgroundColor: c.bg }}>{estadoPedidoLabel[p.estado] ?? p.estado}</span>
                    {p.pagado ? <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-extrabold text-green-700">💰 Pagado</span>
                      : <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800">⏳ Cobrar ${totalPed.toLocaleString("es-CL")}</span>}
                  </div>
                </div>

                <ul className="mt-2 rounded-lg bg-slate-50 p-2 text-sm">
                  {p.items.map((it) => <li key={it.id} className="text-slate-700">{it.cantidad}x {it.producto.nombre}</li>)}
                </ul>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  {mapa ? (
                    <a href={mapa} target="_blank" rel="noopener" className="rounded-lg bg-[#1479c4] py-2.5 text-center text-sm font-extrabold text-white active:scale-95">📍 Cómo llegar</a>
                  ) : (
                    <span className="rounded-lg bg-slate-100 py-2.5 text-center text-sm font-semibold text-slate-400">sin ubicación</span>
                  )}
                  {p.negocio?.whatsapp ? (
                    <a href={`https://wa.me/${p.negocio.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="rounded-lg bg-[#25D366] py-2.5 text-center text-sm font-extrabold text-white active:scale-95">💬 Cliente</a>
                  ) : <span />}
                </div>

                {listo && (
                  <form action={cambiarEstadoPedido} className="mt-2">
                    <input type="hidden" name="pedidoId" value={p.id} />
                    <input type="hidden" name="estado" value="entregado" />
                    <button className="w-full rounded-lg bg-[#0f766e] py-3 text-sm font-extrabold text-white active:scale-95">✅ Marcar entregado</button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
