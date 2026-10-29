import { prisma } from "@/lib/prisma";
import { inicioDelDia } from "@/lib/dominio/empresa";
import { estadoPedidoLabel } from "@/lib/dominio/pedidos";
import { entregarPedidoReparto, borrarPedidoReparto, resolverPedidoWeb, pagoPedidoReparto, editarPedidoReparto } from "../actions";
import CapturaPedido from "../pedidos/CapturaPedido";
import VentaDictada from "../pedidos/VentaDictada";

export const dynamic = "force-dynamic";

// Pedidos online: pantalla única del vendedor para los pedidos que llegan por
// WhatsApp, por el catálogo y por la tienda online. Permite anotarlos, agendarlos
// (fecha), prepararlos e ir a dejarlos / marcarlos entregados. Reemplaza las
// pantallas sueltas de Anotar / Pedidos / Agendados / Ventas de reparto.

const fmtCLP = (n: number) => "$" + n.toLocaleString("es-CL");
const diaKey = (d: Date) => new Date(d).toLocaleDateString("es-CL");
function diaLabel(d: Date) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const diff = Math.round((x.getTime() - hoy.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return new Date(d).toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "short" });
}
const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

type Fila = {
  key: string; cliente: string; detalle: string; monto: number; cobrado: boolean;
  dia: Date; estado: string; origen: "whatsapp" | "web"; tel: string | null; maps: string | null;
  repartoId?: string; webId?: string;
};

export default async function PedidosOnline({ searchParams }: { searchParams: Promise<{ venta?: string }> }) {
  const { venta } = await searchParams;
  const hoy = await inicioDelDia();
  const hace7 = new Date(); hace7.setDate(hace7.getDate() - 7); hace7.setHours(0, 0, 0, 0);

  const [reparto, web, repEntregado, webEntregado, negocios, entregadosHoy] = await Promise.all([
    prisma.pedidoReparto.findMany({ where: { estado: { in: ["pendiente", "en_ruta"] } }, orderBy: [{ fecha: "asc" }, { orden: "asc" }], take: 200 }),
    prisma.pedido.findMany({
      where: { tipoEntrega: { in: ["delivery", "despacho", "reparto"] }, estado: { notIn: ["entregado", "finalizado"] } },
      orderBy: [{ fechaAgenda: "asc" }, { createdAt: "asc" }], take: 200,
      include: { negocio: { select: { nombreNegocio: true, whatsapp: true, latitud: true, longitud: true } }, items: { include: { producto: { select: { nombre: true } } } } },
    }),
    prisma.pedidoReparto.findMany({ where: { estado: "entregado", entregadoEn: { gte: hace7 } }, orderBy: { entregadoEn: "desc" }, take: 100 }),
    prisma.pedido.findMany({
      where: { tipoEntrega: { in: ["delivery", "despacho", "reparto"] }, estado: { in: ["entregado", "finalizado"] }, createdAt: { gte: hace7 } },
      orderBy: { createdAt: "desc" }, take: 100,
      include: { negocio: { select: { nombreNegocio: true } }, items: { include: { producto: { select: { nombre: true } } } } },
    }),
    prisma.negocio.findMany({ select: { nombreNegocio: true, nombreContacto: true }, take: 500 }),
    prisma.pedidoReparto.count({ where: { estado: "entregado", entregadoEn: { gte: hoy } } }),
  ]);

  const clientes = [...new Set(negocios.map((n) => n.nombreNegocio || n.nombreContacto).filter((x): x is string => !!x))].sort();

  // ----- Por entregar (WhatsApp/anotado + web/tienda) -----
  const porEntregar: Fila[] = [
    ...reparto.map((p) => ({
      key: `r-${p.id}`, cliente: p.cliente || "Cliente", detalle: p.pedido, monto: Number(p.monto ?? 0),
      cobrado: p.estadoPago === "pagado", dia: p.fecha, estado: "Agendado", origen: "whatsapp" as const, tel: p.telefono,
      maps: p.lat != null && p.lng != null ? `https://www.google.com/maps?q=${p.lat},${p.lng}` : p.mapsUrl, repartoId: p.id,
    })),
    ...web.map((p) => ({
      key: `w-${p.id}`, cliente: p.negocio?.nombreNegocio ?? "Cliente",
      detalle: p.items.map((it) => `${it.cantidad}x ${it.producto.nombre}`).join(", ") || "Pedido web",
      monto: p.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0), cobrado: p.pagado,
      dia: p.fechaAgenda ?? p.createdAt, estado: estadoPedidoLabel[p.estado] ?? p.estado, origen: "web" as const,
      tel: p.negocio?.whatsapp ?? null, maps: p.negocio?.latitud != null && p.negocio?.longitud != null ? `https://www.google.com/maps?q=${p.negocio.latitud},${p.negocio.longitud}` : null,
      webId: p.id,
    })),
  ];
  const grupos = new Map<string, Fila[]>();
  for (const f of porEntregar.sort((a, b) => new Date(a.dia).getTime() - new Date(b.dia).getTime())) {
    const k = diaKey(f.dia);
    (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(f);
  }

  // ----- Entregados (últimos 7 días) -----
  type Ent = { key: string; cliente: string; detalle: string; monto: number; cobrado: boolean; cuando: Date };
  const entregados: Ent[] = [
    ...repEntregado.map((p) => ({ key: `re-${p.id}`, cliente: p.cliente || "Cliente", detalle: p.pedido, monto: Number(p.monto ?? 0), cobrado: p.estadoPago === "pagado", cuando: p.entregadoEn ?? p.fecha })),
    ...webEntregado.map((p) => ({ key: `we-${p.id}`, cliente: p.negocio?.nombreNegocio ?? "Cliente", detalle: p.items.map((it) => `${it.cantidad}x ${it.producto.nombre}`).join(", ") || "Pedido web", monto: p.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0), cobrado: p.pagado, cuando: p.createdAt })),
  ].sort((a, b) => new Date(b.cuando).getTime() - new Date(a.cuando).getTime());
  const vendido7 = entregados.reduce((s, f) => s + f.monto, 0);
  const porCobrar7 = entregados.filter((f) => !f.cobrado).reduce((s, f) => s + f.monto, 0);

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">🛍️ Pedidos online</h1>
          <p className="text-xs text-slate-500">WhatsApp, catálogo y tienda online. Anota, agenda y marca entregado.</p>
        </div>
        <span className="rounded-full bg-[#1479c4] px-3 py-1 text-sm font-extrabold text-white">{porEntregar.length}</span>
      </div>

      {venta && <p className="rounded-xl bg-green-100 px-4 py-2.5 text-center text-sm font-bold text-green-700">✓ Venta registrada</p>}

      {/* Anotar un pedido nuevo (pegar WhatsApp o dictar) */}
      <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-extrabold text-[#1479c4]">➕ Anotar pedido nuevo</summary>
        <div className="space-y-3 border-t border-slate-100 p-4">
          <CapturaPedido clientes={clientes} />
          <VentaDictada clientes={clientes} />
        </div>
      </details>

      {/* Por entregar */}
      <section>
        <h2 className="mb-2 text-sm font-extrabold text-slate-900">📦 Por entregar ({porEntregar.length})</h2>
        {porEntregar.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">✅ No hay pedidos por entregar.</p>
        ) : (
          <div className="space-y-4">
            {[...grupos.entries()].map(([k, items]) => (
              <div key={k}>
                <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{diaLabel(items[0].dia)} · {items.length}</h3>
                <ul className="space-y-1.5">
                  {items.map((f) => (
                    <li key={f.key} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                            <span>{f.origen === "web" ? "🌐" : "💬"}</span>{f.cliente}
                          </p>
                          <p className="text-xs text-slate-600">{f.detalle}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-0.5">
                          {f.monto > 0 && <span className="text-sm font-extrabold text-slate-800">{fmtCLP(f.monto)}</span>}
                          {f.repartoId ? (
                            <form action={pagoPedidoReparto}>
                              <input type="hidden" name="id" value={f.repartoId} />
                              <input type="hidden" name="estadoPago" value={f.cobrado ? "por_cobrar" : "pagado"} />
                              <button className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${f.cobrado ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>{f.cobrado ? "pagado" : "por cobrar"}</button>
                            </form>
                          ) : (
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${f.cobrado ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>{f.cobrado ? "pagado" : "por cobrar"}</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{f.estado}</span>
                        {f.maps && <a href={f.maps} target="_blank" rel="noreferrer" className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">📍 Ir</a>}
                        {f.tel && <a href={`https://wa.me/${f.tel.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">💬 Avisar</a>}
                        {f.repartoId && (
                          <form action={entregarPedidoReparto} className="ml-auto"><input type="hidden" name="id" value={f.repartoId} /><button className="rounded-full bg-[#0f766e] px-3 py-0.5 text-[10px] font-bold text-white">✅ Entregado</button></form>
                        )}
                        {f.webId && (
                          <form action={resolverPedidoWeb} className="ml-auto"><input type="hidden" name="id" value={f.webId} /><input type="hidden" name="accion" value="entregado" /><button className="rounded-full bg-[#0f766e] px-3 py-0.5 text-[10px] font-bold text-white">✅ Entregado</button></form>
                        )}
                      </div>

                      {/* Editar / quitar el pedido */}
                      {f.repartoId && (
                        <details className="mt-1.5 border-t border-slate-100 pt-1.5">
                          <summary className="cursor-pointer list-none text-[11px] font-bold text-slate-500">✏️ Editar / quitar</summary>
                          <form action={editarPedidoReparto} className="mt-2 space-y-1.5">
                            <input type="hidden" name="id" value={f.repartoId} />
                            <input name="cliente" defaultValue={f.cliente} placeholder="Cliente" className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
                            <input name="pedido" defaultValue={f.detalle} placeholder="Detalle del pedido" className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
                            <div className="flex gap-1.5">
                              <input name="monto" inputMode="numeric" defaultValue={f.monto || ""} placeholder="Monto" className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
                              <input type="date" name="fecha" defaultValue={new Date(f.dia).toISOString().slice(0, 10)} className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
                            </div>
                            <select name="estadoPago" defaultValue={f.cobrado ? "pagado" : "por_cobrar"} className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm">
                              <option value="por_cobrar">Por cobrar (queda debiendo)</option>
                              <option value="pagado">Pagado</option>
                            </select>
                            <button className="w-full rounded-lg bg-[#1479c4] py-2 text-xs font-extrabold text-white">💾 Guardar cambios</button>
                          </form>
                          <form action={borrarPedidoReparto} className="mt-1.5">
                            <input type="hidden" name="id" value={f.repartoId} />
                            <button className="w-full rounded-lg border border-rose-200 bg-rose-50 py-2 text-xs font-extrabold text-rose-600">🗑️ Quitar pedido de la lista</button>
                          </form>
                        </details>
                      )}
                      {f.webId && (
                        <details className="mt-1.5 border-t border-slate-100 pt-1.5">
                          <summary className="cursor-pointer list-none text-[11px] font-bold text-slate-500">Quitar</summary>
                          <form action={resolverPedidoWeb} className="mt-1.5">
                            <input type="hidden" name="id" value={f.webId} /><input type="hidden" name="accion" value="quitar" />
                            <button className="w-full rounded-lg border border-rose-200 bg-rose-50 py-2 text-xs font-extrabold text-rose-600">🗑️ Quitar pedido de la lista</button>
                          </form>
                        </details>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Entregados (últimos 7 días) */}
      <details className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <summary className="cursor-pointer list-none px-4 py-3 text-sm font-extrabold text-slate-700">
          🧾 Entregados (7 días) · {fmtCLP(vendido7)}{porCobrar7 > 0 ? ` · por cobrar ${fmtCLP(porCobrar7)}` : ""}
          {entregadosHoy > 0 ? ` · ${entregadosHoy} hoy` : ""}
        </summary>
        <div className="border-t border-slate-100 p-3">
          {entregados.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-500">Aún no hay entregas registradas.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {entregados.slice(0, 60).map((f) => (
                <li key={f.key} className="flex items-start justify-between gap-2 py-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800">{f.cliente}</p>
                    <p className="text-[11px] text-slate-500">{f.detalle} · {fmtHora(f.cuando)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    {f.monto > 0 && <span className="font-bold text-slate-800">{fmtCLP(f.monto)}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${f.cobrado ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>{f.cobrado ? "pagado" : "por cobrar"}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}
