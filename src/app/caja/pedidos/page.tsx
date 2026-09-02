import { prisma } from "@/lib/prisma";
import { ESTADOS_PEDIDO, estadoPedidoLabel, estadoPedidoColor } from "@/lib/dominio/pedidos";
import { cambiarEstadoPedido } from "@/app/admin/pedidos/actions";
import AutoRefrescar from "./AutoRefrescar";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
const canalIcono: Record<string, string> = { online: "🌐", whatsapp: "💬", instagram: "📷", llamada: "📞", agenda: "📅", sala: "🏪", preventa: "📲" };
const entregaLabel: Record<string, string> = { retiro: "🏪 Retiro", despacho: "🛵 Despacho", reparto: "🚚 Reparto" };

/** Siguiente estado en el flujo (para el botón de avanzar). */
function siguiente(estado: string): string | null {
  const i = (ESTADOS_PEDIDO as readonly string[]).indexOf(estado);
  return i >= 0 && i < ESTADOS_PEDIDO.length - 1 ? ESTADOS_PEDIDO[i + 1] : null;
}

export default async function PedidosLocal() {
  const pedidos = await prisma.pedido.findMany({
    where: { estado: { notIn: ["entregado", "finalizado"] } },
    orderBy: { createdAt: "asc" },
    include: {
      negocio: { select: { nombreNegocio: true, whatsapp: true, latitud: true, longitud: true, direccion: true } },
      items: { include: { producto: { select: { nombre: true } } } },
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <AutoRefrescar />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">📋 Pedidos por preparar</h1>
          <p className="text-sm text-slate-500">Se actualiza solo. Prepara y avanza el estado.</p>
        </div>
        <span className="rounded-full bg-red-600 px-3 py-1 text-sm font-extrabold text-white">{pedidos.length}</span>
      </div>

      {pedidos.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">✅ No hay pedidos pendientes. ¡Todo al día!</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {pedidos.map((p) => {
            const c = estadoPedidoColor[p.estado] ?? { color: "#334155", bg: "#e2e8f0" };
            const sig = siguiente(p.estado);
            const esNuevo = p.estado === "solicitud";
            return (
              <li key={p.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${esNuevo ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{canalIcono[p.canal] ?? "🛒"} {p.negocio?.nombreNegocio ?? "Cliente"}</p>
                    <p className="text-xs text-slate-500">{(p.tipoEntrega ? (entregaLabel[p.tipoEntrega] ?? p.tipoEntrega) : "—")} · pedido 🕐 {fmtHora(p.createdAt)}{p.notas ? ` · ${p.notas}` : ""}</p>
                    {p.fechaAgenda && (
                      <p className="mt-0.5 inline-block rounded-md bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800">
                        📅 Para: {new Date(p.fechaAgenda).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" })} · {fmtHora(p.fechaAgenda)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: c.color, backgroundColor: c.bg }}>{estadoPedidoLabel[p.estado] ?? p.estado}</span>
                    {p.pagado ? (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-extrabold text-green-700">💰 Pagado</span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-800">⏳ Por cobrar</span>
                    )}
                  </div>
                </div>

                <ul className="mt-2 rounded-lg bg-slate-50 p-2 text-sm">
                  {p.items.map((it) => (
                    <li key={it.id} className="flex justify-between py-0.5">
                      <span className="text-slate-700">{it.cantidad}x {it.producto.nombre}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex items-center gap-2">
                  {sig && (
                    <form action={cambiarEstadoPedido} className="flex-1">
                      <input type="hidden" name="pedidoId" value={p.id} />
                      <input type="hidden" name="estado" value={sig} />
                      <button className="w-full rounded-lg bg-[#0f766e] py-2.5 text-sm font-extrabold text-white active:scale-95">
                        {p.estado === "solicitud" || p.estado === "confirmado" ? "▶️ Empezar a preparar"
                          : p.estado === "preparacion" ? "✅ Marcar Listo"
                          : "🛵 Entregar / despachar"}
                      </button>
                    </form>
                  )}
                  {p.negocio?.latitud != null && p.negocio?.longitud != null && (
                    <a href={`https://www.google.com/maps?q=${p.negocio.latitud},${p.negocio.longitud}`} target="_blank" rel="noopener" className="shrink-0 rounded-lg bg-[#1479c4] px-3 py-2.5 text-sm font-bold text-white" title="Ubicación del cliente">📍</a>
                  )}
                  {p.negocio?.whatsapp && (
                    <a href={`https://wa.me/${p.negocio.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener" className="shrink-0 rounded-lg bg-[#25D366] px-3 py-2.5 text-sm font-bold text-white">💬</a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
