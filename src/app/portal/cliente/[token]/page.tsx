import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtCLP, estadoPedidoLabel, estadoPedidoColor } from "@/lib/dominio/pedidos";
import { whatsappLink } from "@/lib/config";
import { tarifaDeCliente } from "@/lib/dominio/portal";
import { imagenDefault } from "@/app/tienda/page";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
const tipoNovedad: Record<string, { label: string; color: string }> = {
  promo: { label: "🔥 Promo", color: "#e23b2c" },
  nuevo: { label: "✨ Nuevo", color: "#1479c4" },
  sabor: { label: "🍦 Nuevo sabor", color: "#0f766e" },
};

export default async function PortalCliente({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const negocio = await prisma.negocio.findUnique({
    where: { portalToken: token },
    include: {
      ventas: { include: { pagos: { select: { monto: true } } }, orderBy: { fecha: "desc" } },
      pedidos: {
        where: { estado: { notIn: ["anulado"] } },
        include: { items: { include: { producto: { select: { nombre: true, fotoUrl: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 8,
      },
    },
  });

  if (!negocio) notFound();

  const [empresa, novedades] = await Promise.all([
    prisma.empresa.findFirst(),
    prisma.novedad.findMany({ where: { activo: true }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const marca = empresa?.nombre ?? "Benechito";
  const tarifa = tarifaDeCliente(negocio.tipoCliente);

  // Cuenta corriente.
  const ccTotal = negocio.ventas.reduce((s, v) => s + Number(v.total), 0);
  const ccPagado = negocio.ventas.reduce((s, v) => s + v.pagos.reduce((a, p) => a + Number(p.monto), 0), 0);
  const ccSaldo = ccTotal - ccPagado;

  const linkPedir = `/tienda?t=${tarifa.codigo}&c=${token}`;
  const waBenechito = whatsappLink(`¡Hola ${marca}! Soy ${negocio.nombreNegocio}. `);

  return (
    <div className="min-h-screen bg-crema pb-10">
      {/* Encabezado personal */}
      <header className="bg-gradient-to-b from-azul to-[#0f5e9c] px-4 pb-6 pt-7 text-center text-white">
        <img src="/marca/logo.png" alt={marca} className="mx-auto h-12 w-auto brightness-0 invert" />
        <p className="mt-3 text-sm text-white/80">Tu espacio de cliente</p>
        <h1 className="font-display text-2xl font-extrabold leading-tight">Hola, {negocio.nombreNegocio} 👋</h1>
        <span className="mt-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold">⭐ {tarifa.label}</span>
      </header>

      <div className="mx-auto -mt-3 max-w-md space-y-5 px-4">
        {/* CTA principal: pedir */}
        <Link href={linkPedir} className="block rounded-2xl bg-gradient-to-r from-naranja to-naranja-2 p-4 text-center text-white shadow-lg active:scale-[0.98]">
          <p className="font-display text-lg font-extrabold">🛒 Hacer un pedido</p>
          <p className="text-xs text-white/90">Con tu {tarifa.label.toLowerCase()} ya aplicado</p>
        </Link>

        {/* Novedades & promos */}
        {novedades.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-lg font-extrabold text-tinta">🔥 Novedades para ti</h2>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
              {novedades.map((n) => {
                const m = tipoNovedad[n.tipo] ?? tipoNovedad.promo;
                return (
                  <div key={n.id} className="w-64 shrink-0 snap-start overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-crema-2">
                    {n.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.fotoUrl} alt={n.titulo} className="aspect-video w-full object-cover" />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center text-4xl" style={{ backgroundColor: `${m.color}18` }}>{m.label.split(" ")[0]}</div>
                    )}
                    <div className="p-3">
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: m.color }}>{m.label}</span>
                      <p className="mt-1.5 font-bold leading-tight text-tinta">{n.titulo}</p>
                      {n.descripcion && <p className="mt-0.5 line-clamp-2 text-xs text-choco-2">{n.descripcion}</p>}
                      <Link href={linkPedir} className="mt-2 block rounded-lg bg-azul py-2 text-center text-xs font-extrabold text-white active:scale-95">{n.cta || "Pedir ahora"}</Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Beneficios */}
        <section className="grid grid-cols-2 gap-2">
          {[
            { i: "🏷️", t: tarifa.label, s: "Siempre para ti" },
            { i: "⚡", t: "Pedido en 1 toque", s: "Sin repetir datos" },
            { i: "🛵", t: "Retiro o despacho", s: "Como te acomode" },
            { i: "💬", t: "Atención directa", s: "Hablas con la fábrica" },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-crema-2">
              <div className="text-2xl">{b.i}</div>
              <p className="mt-1 text-sm font-extrabold leading-tight text-tinta">{b.t}</p>
              <p className="text-xs text-choco-2">{b.s}</p>
            </div>
          ))}
        </section>

        {/* Estado de cuenta */}
        <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-crema-2">
          <h2 className="font-display text-lg font-extrabold text-tinta">📊 Mi estado de cuenta</h2>
          {negocio.ventas.length === 0 ? (
            <p className="mt-1 text-sm text-choco-2">Aún no tienes compras registradas. ¡Haz tu primer pedido! 🎉</p>
          ) : (
            <>
              <div className="mt-3 flex items-center justify-between rounded-xl p-3" style={{ backgroundColor: ccSaldo > 0 ? "#e23b2c12" : "#0f766e12" }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-choco-2">{ccSaldo > 0 ? "Saldo por pagar" : "Estás al día"}</p>
                  <p className={`font-display text-2xl font-extrabold ${ccSaldo > 0 ? "text-rojo" : "text-verde"}`}>{fmtCLP(Math.max(0, ccSaldo))}</p>
                </div>
                {ccSaldo > 0 ? (
                  <a href={whatsappLink(`¡Hola ${marca}! Quiero pagar mi saldo de ${fmtCLP(ccSaldo)}. Soy ${negocio.nombreNegocio}.`)} target="_blank" rel="noopener" className="rounded-full bg-verde px-4 py-2 text-sm font-bold text-white">💵 Pagar</a>
                ) : (
                  <span className="text-2xl">✅</span>
                )}
              </div>
              <div className="mt-3 space-y-1.5">
                {negocio.ventas.slice(0, 6).map((v) => {
                  const pagado = v.pagos.reduce((s, p) => s + Number(p.monto), 0);
                  const saldo = Number(v.total) - pagado;
                  return (
                    <div key={v.id} className="flex items-center justify-between border-t border-crema-2 pt-1.5 text-sm">
                      <span className="text-choco-2">{fmtFecha(v.fecha)}{v.etiqueta ? ` · ${v.etiqueta}` : ""}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-tinta">{fmtCLP(Number(v.total))}</span>
                        {saldo > 0
                          ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">debe {fmtCLP(saldo)}</span>
                          : <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">pagado</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {/* Mis pedidos */}
        {negocio.pedidos.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-lg font-extrabold text-tinta">📦 Mis pedidos</h2>
            <div className="space-y-3">
              {negocio.pedidos.map((p) => {
                const c = estadoPedidoColor[p.estado] ?? { color: "#334155", bg: "#e2e8f0" };
                const total = p.items.reduce((s, it) => s + Number(it.precioUnit) * it.cantidad, 0);
                return (
                  <div key={p.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-crema-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-choco-2">{fmtFecha(p.createdAt)} · {p.tipoEntrega === "delivery" ? "🛵 Despacho" : "🏪 Retiro"}</span>
                      <span className="rounded-full px-2.5 py-1 text-xs font-bold" style={{ color: c.color, backgroundColor: c.bg }}>{estadoPedidoLabel[p.estado] ?? p.estado}</span>
                    </div>
                    {/* Miniaturas de productos */}
                    <div className="mt-2 flex gap-2 overflow-x-auto">
                      {p.items.map((it) => {
                        const foto = it.producto.fotoUrl || imagenDefault(it.producto.nombre);
                        return (
                          <div key={it.id} className="w-16 shrink-0 text-center">
                            <div className="relative aspect-square w-16 overflow-hidden rounded-lg bg-white ring-1 ring-crema-2">
                              {foto ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={foto} alt={it.producto.nombre} className="h-full w-full object-contain" />
                              ) : (
                                <div className="grid h-full w-full place-items-center bg-crema text-lg">🍫</div>
                              )}
                              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-azul text-[10px] font-bold text-white">{it.cantidad}</span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-choco-2">{it.producto.nombre}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-crema-2 pt-2">
                      <span className="text-sm font-extrabold text-tinta">{fmtCLP(total)}</span>
                      <span className={`text-xs font-bold ${p.pagado ? "text-verde" : "text-amber-700"}`}>{p.pagado ? "💰 Pagado" : "⏳ Por pagar"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Repetir / pedir de nuevo */}
        <Link href={linkPedir} className="block rounded-2xl border-2 border-dashed border-azul/40 bg-white p-4 text-center text-azul active:scale-[0.98]">
          <p className="font-extrabold">🔁 Volver a pedir</p>
          <p className="text-xs text-choco-2">Abre el catálogo con tu precio</p>
        </Link>

        {/* Contacto */}
        <a href={waBenechito} target="_blank" rel="noopener" className="block rounded-2xl bg-[#25D366] p-3 text-center text-sm font-extrabold text-white active:scale-95">💬 Escribir a {marca}</a>

        <p className="pt-2 text-center text-[11px] text-choco-2">Hecho a lo Benechito ♥ · Tu portal personal</p>
      </div>
    </div>
  );
}
