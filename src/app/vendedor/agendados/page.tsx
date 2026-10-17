import { prisma } from "@/lib/prisma";
import { estadoPedidoLabel } from "@/lib/dominio/pedidos";
import { entregarPedidoReparto, borrarPedidoReparto, resolverPedidoWeb } from "../actions";

export const dynamic = "force-dynamic";

const fmtCLP = (n: number) => "$" + n.toLocaleString("es-CL");
function diaKey(d: Date) { return new Date(d).toLocaleDateString("es-CL"); }
function diaLabel(d: Date) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const diff = Math.round((x.getTime() - hoy.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return new Date(d).toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "short" });
}

type Fila = {
  key: string; cliente: string; detalle: string; monto: number; cobrado: boolean;
  dia: Date; estado: string; tel: string | null; maps: string | null; repartoId?: string; webId?: string;
};

export default async function Agendados() {
  const [reparto, web] = await Promise.all([
    prisma.pedidoReparto.findMany({ where: { estado: { in: ["pendiente", "en_ruta"] } }, orderBy: [{ fecha: "asc" }, { orden: "asc" }], take: 200 }),
    prisma.pedido.findMany({
      where: { tipoEntrega: { in: ["delivery", "despacho", "reparto"] }, estado: { notIn: ["entregado", "finalizado"] } },
      orderBy: [{ fechaAgenda: "asc" }, { createdAt: "asc" }], take: 200,
      include: { negocio: { select: { nombreNegocio: true, whatsapp: true, latitud: true, longitud: true } }, items: { include: { producto: { select: { nombre: true } } } } },
    }),
  ]);

  const filas: Fila[] = [
    ...reparto.map((p) => ({
      key: `r-${p.id}`, cliente: p.cliente || "Cliente", detalle: p.pedido, monto: Number(p.monto ?? 0),
      cobrado: p.estadoPago === "pagado", dia: p.fecha, estado: "Agendado", tel: p.telefono,
      maps: p.lat != null && p.lng != null ? `https://www.google.com/maps?q=${p.lat},${p.lng}` : p.mapsUrl, repartoId: p.id,
    })),
    ...web.map((p) => ({
      key: `w-${p.id}`, cliente: p.negocio?.nombreNegocio ?? "Cliente",
      detalle: p.items.map((it) => `${it.cantidad}x ${it.producto.nombre}`).join(", ") || "Pedido web",
      monto: p.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0), cobrado: p.pagado,
      dia: p.fechaAgenda ?? p.createdAt, estado: estadoPedidoLabel[p.estado] ?? p.estado,
      tel: p.negocio?.whatsapp ?? null, maps: p.negocio?.latitud != null && p.negocio?.longitud != null ? `https://www.google.com/maps?q=${p.negocio.latitud},${p.negocio.longitud}` : null,
      webId: p.id,
    })),
  ];

  // Agrupa por día.
  const grupos = new Map<string, Fila[]>();
  for (const f of filas.sort((a, b) => new Date(a.dia).getTime() - new Date(b.dia).getTime())) {
    const k = diaKey(f.dia);
    (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(f);
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">📋 Agendados</h1>
          <p className="text-xs text-slate-500">Todo lo que hay que entregar, en lista. Nombre y pedido de un vistazo.</p>
        </div>
        <span className="rounded-full bg-[#1479c4] px-3 py-1 text-sm font-extrabold text-white">{filas.length}</span>
      </div>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">✅ No hay pedidos agendados.</p>
      ) : (
        [...grupos.entries()].map(([k, items]) => (
          <section key={k}>
            <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{diaLabel(items[0].dia)} · {items.length}</h2>
            <ul className="space-y-1.5">
              {items.map((f) => (
                <li key={f.key} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{f.cliente}</p>
                      <p className="text-xs text-slate-600">{f.detalle}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      {f.monto > 0 && <span className="text-sm font-extrabold text-slate-800">{fmtCLP(f.monto)}</span>}
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${f.cobrado ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>{f.cobrado ? "pagado" : "por cobrar"}</span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{f.estado}</span>
                    {f.maps && <a href={f.maps} target="_blank" rel="noreferrer" className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">📍 Ir</a>}
                    {f.tel && <a href={`https://wa.me/${f.tel.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">💬</a>}
                    {f.repartoId && (
                      <span className="ml-auto flex items-center gap-1.5">
                        <form action={entregarPedidoReparto}>
                          <input type="hidden" name="id" value={f.repartoId} />
                          <button className="rounded-full bg-[#0f766e] px-2.5 py-0.5 text-[10px] font-bold text-white">✅ Entregado</button>
                        </form>
                        <form action={borrarPedidoReparto}>
                          <input type="hidden" name="id" value={f.repartoId} />
                          <button className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-rose-500">✕ Quitar</button>
                        </form>
                      </span>
                    )}
                    {f.webId && (
                      <span className="ml-auto flex items-center gap-1.5">
                        <form action={resolverPedidoWeb}>
                          <input type="hidden" name="id" value={f.webId} />
                          <input type="hidden" name="accion" value="entregado" />
                          <button className="rounded-full bg-[#0f766e] px-2.5 py-0.5 text-[10px] font-bold text-white">✅ Entregado</button>
                        </form>
                        <form action={resolverPedidoWeb}>
                          <input type="hidden" name="id" value={f.webId} />
                          <input type="hidden" name="accion" value="quitar" />
                          <button className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-rose-500">✕ Quitar</button>
                        </form>
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
