import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ESTADOS, estadoMeta, type Estado } from "@/lib/estados";
import {
  cambiarEstado,
  agregarNota,
  registrarReposicion,
  eliminarNegocio,
  actualizarClasificacion,
} from "../actions";
import { registrarDeuda, abonarCuenta, registrarVentaSimple, registrarCobro } from "@/app/vendedor/actions";
import { MEDIOS_PAGO, medioPagoLabel } from "@/lib/dominio/ventas";
import { TIPOS_CLIENTE, tipoClienteLabel, canalLabel, COMPRA_TIPOS, compraLabel } from "@/lib/dominio/precios";
import { fmtCLP } from "@/lib/dominio/pedidos";

export const dynamic = "force-dynamic";

const fmt = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtHora = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function FichaNegocio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const negocio = await prisma.negocio.findUnique({
    where: { id },
    include: {
      actividades: { orderBy: { createdAt: "desc" } },
      productos: { include: { producto: true } },
      reposiciones: { orderBy: { fecha: "desc" }, take: 5 },
      ventas: { include: { pagos: { select: { monto: true } } }, orderBy: { fecha: "desc" } },
    },
  });

  if (!negocio) notFound();

  // Cuenta corriente: total vendido, pagado y saldo (deuda) del cliente.
  const ccTotal = negocio.ventas.reduce((s, v) => s + Number(v.total), 0);
  const ccPagado = negocio.ventas.reduce(
    (s, v) => s + v.pagos.reduce((a, p) => a + Number(p.monto), 0),
    0,
  );
  const ccSaldo = ccTotal - ccPagado;
  const meta = estadoMeta[negocio.estado as Estado];
  const waLink = `https://wa.me/${negocio.whatsapp.replace(/[^0-9]/g, "")}`;

  const listas = await prisma.listaPrecio.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });

  // Lotes de producción despachados a este cliente (trazabilidad / retiro de mercado).
  const lotesRecibidos = await prisma.despachoLote.findMany({
    where: { negocioId: id },
    include: { control: { select: { id: true, lote: true, nombre: true } } },
    orderBy: { fecha: "desc" },
    take: 30,
  });

  return (
    <div>
      <Link href="/admin/negocios" className="text-sm font-semibold text-naranja">
        ← Negocios
      </Link>

      {lotesRecibidos.length > 0 && (
        <details className="mt-2 rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm">
          <summary className="cursor-pointer font-bold text-slate-700">📦 Lotes recibidos ({lotesRecibidos.length})</summary>
          <ul className="mt-2 space-y-1">
            {lotesRecibidos.map((d) => (
              <li key={d.id} className="flex items-center justify-between border-t border-slate-100 pt-1">
                <span className="min-w-0 truncate text-slate-700">
                  <Link href={`/admin/control-calidad/${d.control.id}`} className="font-bold text-slate-900 hover:underline">Lote {d.control.lote ?? "—"}</Link>
                  {" · "}{d.control.nombre}{d.cantidad > 0 ? ` · ${d.cantidad} u.` : ""}
                </span>
                <span className="shrink-0 text-xs text-slate-400">{new Date(d.fecha).toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Encabezado */}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">{negocio.nombreNegocio}</h1>
          <p className="text-choco-2">
            {negocio.nombreContacto} · {negocio.comuna}
            {negocio.ciudad ? `, ${negocio.ciudad}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/negocios/${negocio.id}/editar`}
            className="rounded-lg border border-crema-2 bg-white px-3 py-1.5 text-sm font-semibold text-navy transition hover:border-naranja"
          >
            ✏️ Editar
          </Link>
          <span
            className="rounded-lg px-3 py-1.5 text-sm font-bold"
            style={{ color: meta?.color, backgroundColor: meta?.bg }}
          >
            {meta?.label ?? negocio.estado}
          </span>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-verde px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
        >
          💬 WhatsApp
        </a>
        <form action={cambiarEstado} className="flex items-center gap-2">
          <input type="hidden" name="id" value={negocio.id} />
          <select
            name="estado"
            defaultValue={negocio.estado}
            className="rounded-full border border-crema-2 bg-white px-3 py-2 text-sm font-semibold text-navy outline-none focus:border-naranja"
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{estadoMeta[e].label}</option>
            ))}
          </select>
          <button className="rounded-full bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-2">
            Cambiar estado
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Columna izquierda: datos + fechas + productos */}
        <div className="space-y-5 lg:col-span-2">
          {/* Datos */}
          <Card titulo="Datos">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Dato label="WhatsApp" valor={negocio.whatsapp} />
              <Dato label="Tipo de negocio" valor={negocio.tipoNegocio ?? "—"} />
              <Dato label="Dirección" valor={negocio.direccion ?? "—"} />
              <Dato label="Interés declarado" valor={negocio.interesPunto ?? "—"} />
              <Dato label="Interés en helados" valor={negocio.interesHelados ? "Sí 🍦" : "No"} />
              <Dato label="Origen" valor={negocio.origen} />
            </dl>
            <div className="mt-3 border-t border-crema-2 pt-3">
              <dt className="text-xs uppercase tracking-wide text-choco-2">Ubicación GPS</dt>
              {negocio.latitud && negocio.longitud ? (
                <a
                  href={`https://www.google.com/maps?q=${negocio.latitud},${negocio.longitud}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-naranja underline"
                >
                  🗺️ Ver en mapa ({negocio.latitud.toFixed(5)}, {negocio.longitud.toFixed(5)})
                </a>
              ) : (
                <p className="text-sm text-choco-2">Sin ubicación registrada</p>
              )}
            </div>
          </Card>

          {/* Cuenta corriente */}
          <Card titulo="Cuenta corriente">
            {negocio.ventas.length === 0 ? (
              <p className="text-sm text-choco-2">Sin ventas registradas.</p>
            ) : (
              <div className="flex flex-wrap gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-choco-2">Vendido</p>
                  <p className="font-bold text-navy">{fmtCLP(ccTotal)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-choco-2">Pagado</p>
                  <p className="font-bold text-navy">{fmtCLP(ccPagado)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-choco-2">Saldo (deuda)</p>
                  <p className={`font-extrabold ${ccSaldo > 0 ? "text-rojo" : "text-verde"}`}>
                    {fmtCLP(ccSaldo)}
                  </p>
                </div>
                <div className="ml-auto self-center">
                  <span className="text-xs text-choco-2">{negocio.ventas.length} venta(s)</span>
                </div>
              </div>
            )}

            {/* Acciones de cuenta: cobrar (abono), vender y registrar deuda */}
            <div className="mt-4 grid gap-3 border-t border-crema pt-4 sm:grid-cols-2">
              {/* Cobrar / abono a la cuenta (reparte entre las ventas pendientes) */}
              <form action={abonarCuenta} className="rounded-xl bg-verde/5 p-3 ring-1 ring-verde/20">
                <p className="text-xs font-extrabold uppercase tracking-wide text-verde">💵 Registrar pago / abono</p>
                <input type="hidden" name="negocioId" value={negocio.id} />
                <input type="hidden" name="volver" value={`/admin/negocios/${negocio.id}`} />
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="text-xs font-bold text-choco-2">Monto
                    <input name="monto" inputMode="numeric" required placeholder="Ej: 20000" className="mt-1 w-28 rounded-lg border border-crema bg-white px-2 py-2 text-sm" />
                  </label>
                  <label className="text-xs font-bold text-choco-2">Medio
                    <select name="medio" defaultValue="efectivo" className="mt-1 rounded-lg border border-crema bg-white px-2 py-2 text-sm">
                      {MEDIOS_PAGO.filter((m) => m !== "credito").map((m) => <option key={m} value={m}>{medioPagoLabel[m] ?? m}</option>)}
                    </select>
                  </label>
                  <button className="rounded-lg bg-verde px-4 py-2 text-sm font-bold text-white">Cobrar</button>
                </div>
                <p className="mt-1 text-[10px] text-choco-2">Se descuenta de la deuda más antigua.</p>
              </form>

              {/* Registrar una venta por monto (pagada o a crédito) */}
              <form action={registrarVentaSimple} className="rounded-xl bg-azul/5 p-3 ring-1 ring-azul/20">
                <p className="text-xs font-extrabold uppercase tracking-wide text-azul">🧾 Registrar venta</p>
                <input type="hidden" name="negocioId" value={negocio.id} />
                <input type="hidden" name="volver" value={`/admin/negocios/${negocio.id}`} />
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <label className="text-xs font-bold text-choco-2">Monto
                    <input name="monto" inputMode="numeric" required placeholder="Ej: 35000" className="mt-1 w-28 rounded-lg border border-crema bg-white px-2 py-2 text-sm" />
                  </label>
                  <label className="text-xs font-bold text-choco-2">Cómo paga
                    <select name="modo" defaultValue="pagado" className="mt-1 rounded-lg border border-crema bg-white px-2 py-2 text-sm">
                      <option value="pagado">Pagada</option>
                      <option value="credito">A crédito (fía)</option>
                    </select>
                  </label>
                  <label className="text-xs font-bold text-choco-2">Medio
                    <select name="medio" defaultValue="efectivo" className="mt-1 rounded-lg border border-crema bg-white px-2 py-2 text-sm">
                      {MEDIOS_PAGO.filter((m) => m !== "credito").map((m) => <option key={m} value={m}>{medioPagoLabel[m] ?? m}</option>)}
                    </select>
                  </label>
                  <input name="concepto" placeholder="Concepto (opcional)" className="min-w-0 flex-1 rounded-lg border border-crema bg-white px-2 py-2 text-sm" />
                  <button className="rounded-lg bg-azul px-4 py-2 text-sm font-bold text-white">Registrar</button>
                </div>
              </form>
            </div>

            {/* Registrar deuda directa (saldo anterior / cargo a cuenta) */}
            <form action={registrarDeuda} className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="negocioId" value={negocio.id} />
              <input type="hidden" name="volver" value={`/admin/negocios/${negocio.id}`} />
              <label className="text-xs font-bold text-choco-2">Deuda anterior
                <input name="monto" inputMode="numeric" required placeholder="Ej: 50000" className="mt-1 w-32 rounded-lg border border-crema bg-white px-2 py-2 text-sm" />
              </label>
              <label className="flex-1 text-xs font-bold text-choco-2">Concepto
                <input name="motivo" placeholder="Ej: Saldo anterior" className="mt-1 w-full rounded-lg border border-crema bg-white px-2 py-2 text-sm" />
              </label>
              <button className="rounded-lg bg-rojo/90 px-4 py-2 text-sm font-bold text-white">➕ Registrar deuda</button>
            </form>
          </Card>

          {/* Historial de compras */}
          <Card titulo="Historial de compras">
            {negocio.ventas.length === 0 ? (
              <p className="text-sm text-choco-2">Aún no tiene compras registradas.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-choco-2">
                    <tr>
                      <th className="py-1.5">Fecha</th>
                      <th className="py-1.5 text-right">Monto</th>
                      <th className="py-1.5 text-right">Pagado</th>
                      <th className="py-1.5 text-right">Saldo</th>
                      <th className="py-1.5 text-right">Cobrar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...negocio.ventas]
                      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                      .map((v) => {
                        const pagado = v.pagos.reduce((s, p) => s + Number(p.monto), 0);
                        const saldo = Number(v.total) - pagado;
                        return (
                          <tr key={v.id} className="border-t border-crema-2">
                            <td className="py-1.5 text-choco">{fmt(v.fecha)}</td>
                            <td className="py-1.5 text-right font-semibold text-navy">{fmtCLP(Number(v.total))}</td>
                            <td className="py-1.5 text-right text-choco-2">{fmtCLP(pagado)}</td>
                            <td className={`py-1.5 text-right font-semibold ${saldo > 0 ? "text-rojo" : "text-verde"}`}>{fmtCLP(saldo)}</td>
                            <td className="py-1.5 text-right">
                              {saldo > 0 ? (
                                <form action={registrarCobro} className="flex items-center justify-end gap-1">
                                  <input type="hidden" name="ventaId" value={v.id} />
                                  <input type="hidden" name="negocioId" value={negocio.id} />
                                  <input type="hidden" name="medio" value="efectivo" />
                                  <input type="hidden" name="volver" value={`/admin/negocios/${negocio.id}`} />
                                  <input name="monto" inputMode="numeric" defaultValue={Math.round(saldo)} className="w-20 rounded border border-crema bg-white px-1.5 py-1 text-right text-xs" />
                                  <button className="rounded bg-verde px-2 py-1 text-xs font-bold text-white" title="Registrar abono (efectivo)">✓</button>
                                </form>
                              ) : (
                                <span className="text-xs text-verde">✓ Pagada</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Clasificación comercial */}
          <Card titulo="Clasificación comercial">
            <p className="mb-3 text-sm text-choco-2">
              El tipo de cliente y la lista de precios determinan qué precio se le aplica en pedidos y
              POS. Si no asignas una lista, el sistema usa la del canal según el tipo.
            </p>
            <form
              action={actualizarClasificacion}
              className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <input type="hidden" name="id" value={negocio.id} />
              <label className="text-sm font-bold text-navy">
                Tipo de cliente
                <select
                  name="tipoCliente"
                  defaultValue={negocio.tipoCliente}
                  className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2 font-normal text-choco outline-none focus:border-naranja"
                >
                  {TIPOS_CLIENTE.map((t) => (
                    <option key={t} value={t}>{tipoClienteLabel[t]}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold text-navy">
                Qué compra
                <select
                  name="compra"
                  defaultValue={negocio.compra ?? ""}
                  className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2 font-normal text-choco outline-none focus:border-naranja"
                >
                  <option value="">— sin definir —</option>
                  {COMPRA_TIPOS.map((c) => <option key={c} value={c}>{compraLabel[c]}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold text-navy sm:col-span-2">
                Lista de precios
                <select
                  name="listaPrecioId"
                  defaultValue={negocio.listaPrecioId ?? ""}
                  className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2 font-normal text-choco outline-none focus:border-naranja"
                >
                  <option value="">Automática (según tipo)</option>
                  {listas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre} · {canalLabel[l.canal] ?? l.canal}
                    </option>
                  ))}
                </select>
              </label>
              <button className="rounded-full bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-2">
                Guardar
              </button>
            </form>
          </Card>

          {/* Fechas */}
          <Card titulo="Fechas">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Dato label="Ingreso" valor={fmt(negocio.fechaIngreso)} />
              <Dato label="Instalación" valor={fmt(negocio.fechaInstalacion)} />
              <Dato label="Última reposición" valor={fmt(negocio.ultimaReposicion)} />
              <Dato label="Próxima reposición" valor={fmt(negocio.proximaReposicion)} />
            </dl>
          </Card>

          {/* Productos instalados */}
          <Card titulo="Productos instalados en la góndola">
            {negocio.productos.length === 0 ? (
              <p className="text-sm text-choco-2">
                Aún no se registran productos instalados. (Se podrá gestionar el
                detalle de la góndola en la siguiente fase del inventario.)
              </p>
            ) : (
              <ul className="divide-y divide-crema-2 text-sm">
                {negocio.productos.map((pp) => (
                  <li key={pp.id} className="flex justify-between py-2">
                    <span className="font-semibold text-navy">
                      {pp.producto.nombre}{" "}
                      <span className="text-choco-2">({pp.producto.linea})</span>
                    </span>
                    <span className="text-choco-2">{pp.cantidadInstalada} u.</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Reposición */}
          <Card titulo="Registrar reposición">
            <form action={registrarReposicion} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <input type="hidden" name="id" value={negocio.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold text-navy">
                  Próxima reposición
                  <input
                    type="date"
                    name="proxima"
                    className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2 font-normal text-choco outline-none focus:border-naranja"
                  />
                </label>
                <label className="text-sm font-bold text-navy">
                  Notas
                  <input
                    name="notas"
                    placeholder="Qué se repuso…"
                    className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2 font-normal text-choco outline-none focus:border-naranja"
                  />
                </label>
              </div>
              <button className="rounded-full bg-naranja px-4 py-2 text-sm font-bold text-white transition hover:bg-naranja-2">
                Registrar
              </button>
            </form>
          </Card>
        </div>

        {/* Columna derecha: historial + nota */}
        <div className="space-y-5">
          <Card titulo="Agregar nota">
            <form action={agregarNota} className="space-y-2">
              <input type="hidden" name="id" value={negocio.id} />
              <textarea
                name="nota"
                rows={3}
                required
                placeholder="Escribe una nota…"
                className="w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2 text-sm outline-none focus:border-naranja"
              />
              <button className="w-full rounded-full bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-2">
                Guardar nota
              </button>
            </form>
          </Card>

          <Card titulo="Historial">
            <ol className="space-y-3">
              {negocio.actividades.map((a) => (
                <li key={a.id} className="border-l-2 border-crema-2 pl-3">
                  <p className="text-sm text-navy">{a.descripcion}</p>
                  <p className="text-xs text-choco-2">{fmtHora(a.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Card>

          <form action={eliminarNegocio}>
            <input type="hidden" name="id" value={negocio.id} />
            <button className="text-sm font-semibold text-rojo/80 hover:text-rojo">
              Eliminar negocio
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-crema-2">
      <h2 className="mb-3 font-display text-lg font-bold text-navy">{titulo}</h2>
      {children}
    </section>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-choco-2">{label}</dt>
      <dd className="font-semibold text-navy">{valor}</dd>
    </div>
  );
}
