import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const fmtCLP = (n: number) => "$" + n.toLocaleString("es-CL");
function diaKey(d: Date) { return new Date(d).toLocaleDateString("es-CL"); }
function diaLabel(d: Date) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const x = new Date(d); x.setHours(0, 0, 0, 0);
  const diff = Math.round((x.getTime() - hoy.getTime()) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === -1) return "Ayer";
  return new Date(d).toLocaleDateString("es-CL", { weekday: "long", day: "2-digit", month: "short" });
}
const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });

type Fila = { key: string; cliente: string; detalle: string; monto: number; cobrado: boolean; cuando: Date };

export default async function RegistroVentasReparto() {
  const desde = new Date(); desde.setDate(desde.getDate() - 7); desde.setHours(0, 0, 0, 0);

  const [reparto, web] = await Promise.all([
    prisma.pedidoReparto.findMany({ where: { estado: "entregado", entregadoEn: { gte: desde } }, orderBy: { entregadoEn: "desc" }, take: 200 }),
    prisma.pedido.findMany({
      where: { tipoEntrega: { in: ["delivery", "despacho", "reparto"] }, estado: { in: ["entregado", "finalizado"] }, createdAt: { gte: desde } },
      orderBy: { createdAt: "desc" }, take: 200,
      include: { negocio: { select: { nombreNegocio: true } }, items: { include: { producto: { select: { nombre: true } } } } },
    }),
  ]);

  const filas: Fila[] = [
    ...reparto.map((p) => ({ key: `r-${p.id}`, cliente: p.cliente || "Cliente", detalle: p.pedido, monto: Number(p.monto ?? 0), cobrado: p.estadoPago === "pagado", cuando: p.entregadoEn ?? p.fecha })),
    ...web.map((p) => ({ key: `w-${p.id}`, cliente: p.negocio?.nombreNegocio ?? "Cliente", detalle: p.items.map((it) => `${it.cantidad}x ${it.producto.nombre}`).join(", ") || "Pedido web", monto: p.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0), cobrado: p.pagado, cuando: p.createdAt })),
  ].sort((a, b) => new Date(b.cuando).getTime() - new Date(a.cuando).getTime());

  const totalVendido = filas.reduce((s, f) => s + f.monto, 0);
  const porCobrar = filas.filter((f) => !f.cobrado).reduce((s, f) => s + f.monto, 0);

  const grupos = new Map<string, Fila[]>();
  for (const f of filas) { const k = diaKey(f.cuando); (grupos.get(k) ?? grupos.set(k, []).get(k)!).push(f); }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">🧾 Registro de ventas (reparto)</h1>
        <p className="text-xs text-slate-500">Lo que entregaste/vendiste en ruta (últimos 7 días).</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-[10px] font-bold uppercase text-slate-400">Vendido</p><p className="text-xl font-extrabold text-[#0f766e]">{fmtCLP(totalVendido)}</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><p className="text-[10px] font-bold uppercase text-slate-400">Por cobrar</p><p className="text-xl font-extrabold text-amber-600">{fmtCLP(porCobrar)}</p></div>
      </div>

      {filas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Aún no hay ventas de reparto registradas.</p>
      ) : (
        [...grupos.entries()].map(([k, items]) => (
          <section key={k}>
            <h2 className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">{diaLabel(items[0].cuando)} · {fmtCLP(items.reduce((s, f) => s + f.monto, 0))}</h2>
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
              {items.map((f) => (
                <li key={f.key} className="flex items-start justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{f.cliente}</p>
                    <p className="text-[11px] text-slate-500">{f.detalle} · {fmtHora(f.cuando)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    {f.monto > 0 && <span className="text-sm font-bold text-slate-800">{fmtCLP(f.monto)}</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${f.cobrado ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-800"}`}>{f.cobrado ? "pagado" : "por cobrar"}</span>
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
