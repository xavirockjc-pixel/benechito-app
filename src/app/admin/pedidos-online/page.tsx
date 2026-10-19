import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ESTADOS_PEDIDO, estadoPedidoLabel, estadoPedidoColor, fmtCLP } from "@/lib/dominio/pedidos";
import { bucketPedido, BUCKETS_ONLINE, type BucketOnline } from "@/lib/dominio/pedidosOnline";
import { cambiarEstadoPedido, derivarRepartoPedido } from "@/app/admin/pedidos/actions";
import AvisoNuevosPedidos from "@/app/_shared/AvisoNuevosPedidos";
import DerivarReparto from "@/app/_shared/DerivarReparto";
import { site } from "@/lib/config";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" });

/** Siguiente estado en el flujo (para el botón de avanzar). */
function siguiente(estado: string): string | null {
  const i = (ESTADOS_PEDIDO as readonly string[]).indexOf(estado);
  return i >= 0 && i < ESTADOS_PEDIDO.length - 1 ? ESTADOS_PEDIDO[i + 1] : null;
}

export default async function PedidosOnline() {
  // Pedidos de la tienda online aún activos (sin entregar/finalizar).
  const pedidos = await prisma.pedido.findMany({
    where: { canal: "online", estado: { notIn: ["entregado", "finalizado"] } },
    orderBy: [{ fechaAgenda: "asc" }, { createdAt: "asc" }],
    include: {
      negocio: { select: { id: true, nombreNegocio: true, whatsapp: true, comuna: true, direccion: true, latitud: true, longitud: true, tipoCliente: true } },
      items: { include: { producto: { select: { nombre: true } } } },
    },
    take: 300,
  });

  // Agrupa en canastos.
  const porBucket = new Map<BucketOnline, typeof pedidos>();
  for (const p of pedidos) {
    const b = bucketPedido(p.tipoEntrega, p.negocio?.tipoCliente);
    (porBucket.get(b) ?? porBucket.set(b, [] as typeof pedidos).get(b)!).push(p);
  }
  const nuevos = pedidos.filter((p) => p.estado === "solicitud").length;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">🛍️ Pedidos online</h1>
          <p className="text-sm text-slate-500">Ordenados por canasto. La moto retira los de delivery en el local.</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-sm font-extrabold text-white">{pedidos.length}</span>
          {nuevos > 0 && <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800">🔔 {nuevos} nuevo{nuevos > 1 ? "s" : ""}</span>}
        </div>
      </div>

      <AvisoNuevosPedidos count={pedidos.length} etiqueta="pedido online" />

      {pedidos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">✅ No hay pedidos online pendientes.</p>
      ) : (
        BUCKETS_ONLINE.map((b) => {
          const lista = porBucket.get(b.id) ?? [];
          if (lista.length === 0) return null;
          return (
            <section key={b.id}>
              <div className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: b.bg }}>
                <span className="text-lg">{b.icono}</span>
                <div className="min-w-0">
                  <p className="text-sm font-extrabold" style={{ color: b.color }}>{b.titulo} · {lista.length}</p>
                  <p className="text-[11px] font-semibold" style={{ color: b.color }}>{b.nota}</p>
                </div>
              </div>

              <ul className="space-y-2.5">
                {lista.map((p) => {
                  const c = estadoPedidoColor[p.estado] ?? { color: "#334155", bg: "#e2e8f0" };
                  const sig = siguiente(p.estado);
                  const esNuevo = p.estado === "solicitud";
                  const total = p.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0);
                  const mapa = p.negocio?.latitud != null && p.negocio?.longitud != null ? `https://www.google.com/maps?q=${p.negocio.latitud},${p.negocio.longitud}` : "";
                  const tel = p.negocio?.whatsapp?.replace(/\D/g, "") ?? "";
                  // Mensaje para la moto / repartidor: datos completos del domicilio.
                  const msgMoto =
                    `🛵 Delivery Benechito\n` +
                    `👤 ${p.negocio?.nombreNegocio ?? "Cliente"}${p.negocio?.whatsapp ? ` · ${p.negocio.whatsapp}` : ""}\n` +
                    (p.negocio?.comuna ? `🏙️ ${p.negocio.comuna}\n` : "") +
                    (p.negocio?.direccion ? `🏠 ${p.negocio.direccion}\n` : "") +
                    (mapa ? `📍 ${mapa}\n` : "") +
                    (p.fechaAgenda ? `📅 ${fmtDia(p.fechaAgenda)} ${fmtHora(p.fechaAgenda)}\n` : "") +
                    `📦 ${p.items.map((it) => `${it.cantidad}x ${it.producto.nombre}`).join(", ")}\n` +
                    `${p.pagado ? "💰 Pagado" : `⏳ Cobrar $${total.toLocaleString("es-CL")}`}`;
                  const waMoto = `https://wa.me/?text=${encodeURIComponent(msgMoto)}`;
                  // Datos del envío listos para pedir una moto externa (Uber Direct / PedidosYa).
                  const envio = [
                    `RETIRO (local): ${site.direccion}`,
                    `ENTREGAR A: ${p.negocio?.nombreNegocio ?? "Cliente"}${p.negocio?.whatsapp ? ` · ${p.negocio.whatsapp}` : ""}`,
                    p.negocio?.direccion || p.negocio?.comuna ? `Dirección: ${[p.negocio?.direccion, p.negocio?.comuna].filter(Boolean).join(", ")}` : "",
                    mapa ? `Ubicación: ${mapa}` : "",
                    `Pedido: ${p.items.map((it) => `${it.cantidad}x ${it.producto.nombre}`).join(", ")}`,
                  ].filter(Boolean).join("\n");
                  return (
                    <li key={p.id} className={`rounded-2xl border bg-white p-3 shadow-sm ${esNuevo ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {p.negocio ? (
                            <Link href={`/admin/negocios/${p.negocio.id}`} className="font-bold text-slate-900 underline-offset-2 hover:underline">{p.negocio.nombreNegocio}</Link>
                          ) : <span className="font-bold text-slate-900">Cliente</span>}
                          <p className="text-xs text-slate-500">
                            {p.negocio?.comuna ? `${p.negocio.comuna} · ` : ""}🕐 {fmtHora(p.createdAt)}
                            {p.fechaAgenda ? ` · 📅 ${fmtDia(p.fechaAgenda)} ${fmtHora(p.fechaAgenda)}` : ""}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: c.color, backgroundColor: c.bg }}>{estadoPedidoLabel[p.estado] ?? p.estado}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${p.pagado ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>{p.pagado ? "💰 Pagado" : "⏳ Por cobrar"}</span>
                        </div>
                      </div>

                      <p className="mt-1.5 rounded-lg bg-slate-50 p-2 text-xs text-slate-700">{p.items.map((it) => `${it.cantidad}x ${it.producto.nombre}`).join(" · ")}</p>
                      <p className="mt-1 text-right text-sm font-extrabold text-slate-800">{fmtCLP(total)}</p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {sig && (
                          <form action={cambiarEstadoPedido} className="flex-1 min-w-[9rem]">
                            <input type="hidden" name="pedidoId" value={p.id} />
                            <input type="hidden" name="estado" value={sig} />
                            <button className="w-full rounded-lg bg-[#0f766e] py-2 text-xs font-extrabold text-white active:scale-95">
                              {p.estado === "solicitud" || p.estado === "confirmado" ? "▶️ Preparar"
                                : p.estado === "preparacion" ? "✅ Listo"
                                : "🛵 Entregar"}
                            </button>
                          </form>
                        )}
                        {b.id === "delivery_moto" && (
                          <a href={waMoto} target="_blank" rel="noopener" className="shrink-0 rounded-lg bg-[#0f766e] px-3 py-2 text-xs font-extrabold text-white" title="Enviar los datos del domicilio a la moto">🛵 A la moto</a>
                        )}
                        {mapa && <a href={mapa} target="_blank" rel="noopener" className="shrink-0 rounded-lg bg-[#1479c4] px-3 py-2 text-xs font-bold text-white" title="Ubicación del cliente">📍</a>}
                        {tel && <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener" className="shrink-0 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-white">💬</a>}
                        {p.negocio && <Link href={`/admin/negocios/${p.negocio.id}`} className="shrink-0 rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600" title="Ver ficha del cliente">🗂️ Ficha</Link>}
                      </div>

                      {(b.id === "delivery_moto" || b.id === "otra_zona") && (
                        <DerivarReparto id={p.id} repartoPor={p.repartoPor} courier={p.courier}
                          costoReparto={p.costoReparto != null ? Number(p.costoReparto) : null}
                          envio={envio} mapsUrl={mapa || undefined} accion={derivarRepartoPedido} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}

      <p className="rounded-xl bg-slate-50 p-3 text-center text-[11px] text-slate-500">
        Cada pedido queda guardado en la <b>ficha del cliente</b> y en <Link href="/admin/negocios" className="font-semibold text-slate-700 underline">Clientes</Link>, para enviarle promociones después.
      </p>
    </div>
  );
}
