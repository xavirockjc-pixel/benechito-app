import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { tipoDocumentoLabel } from "@/lib/dominio/ventas";
import { desmarcarFacturada, reintentarEmision, reintentarPendientes } from "./actions";
import FacturaPendiente from "./FacturaPendiente";
import EnviarFactura from "./EnviarFactura";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
const fmtHora = (d: Date) => new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function FacturacionPage() {
  const autoOn = Boolean(process.env.SII_N8N_WEBHOOK_URL);

  // Documentos tributarios (boleta/factura) con su venta y cliente.
  const docs = await prisma.documentoVenta.findMany({
    where: { tipo: { in: ["boleta", "factura"] } },
    orderBy: { createdAt: "desc" },
    take: 400,
    include: {
      venta: { select: { id: true, total: true, fecha: true, facturada: true, items: { select: { nombre: true, cantidad: true, precioUnit: true } } } },
      negocio: { select: { nombreNegocio: true, rut: true, razonSocial: true, giro: true, direccionFacturacion: true, emailFacturacion: true, whatsapp: true } },
    },
  });

  const rechazados = docs.filter((d) => d.estado === "rechazado");
  const factPendientes = docs.filter((d) => d.estado === "pendiente" && d.tipo === "factura" && !d.venta.facturada);
  const boletasPendientes = docs.filter((d) => d.estado === "pendiente" && d.tipo === "boleta");
  const emitidos = docs.filter((d) => ["emitido", "enviado", "pagado"].includes(d.estado) || (d.estado === "pendiente" && d.venta.facturada));
  const totalPendFact = factPendientes.reduce((s, d) => s + Number(d.montoTotal), 0);
  const enviados = emitidos.filter((d) => d.fechaEnvio).length;

  const conRut = factPendientes.filter((d) => d.negocio.rut);
  const sinRut = factPendientes.filter((d) => !d.negocio.rut);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🧾 Facturación electrónica</h1>
      <p className="text-sm text-slate-500">
        Boletas y facturas de las ventas de la caja, el vendedor en ruta y el panel. Cada documento se envía al cliente por WhatsApp o email y queda registrado como enviado.
      </p>

      {/* Estado de la emisión automática */}
      <div className={`mt-3 flex items-center gap-2 rounded-xl border p-3 text-sm ${autoOn ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
        <span className="text-lg">{autoOn ? "⚡" : "✍️"}</span>
        <div>
          <p className="font-bold">{autoOn ? "Emisión automática CONECTADA" : "Modo manual (emisión automática apagada)"}</p>
          <p className="text-xs">
            {autoOn
              ? "Cada boleta/factura se envía sola al SII vía LibreDTE; el folio y el PDF llegan aquí."
              : "Emite en tu app del SII como siempre y registra aquí el folio. Abajo está la guía para activar la emisión automática."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-2xl font-extrabold text-amber-700">{factPendientes.length}</p><p className="text-xs font-semibold text-amber-700">Facturas por emitir</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-2xl font-extrabold text-slate-900">{fmtCLP(totalPendFact)}</p><p className="text-xs font-semibold text-slate-500">Monto pendiente</p></div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4"><p className="text-2xl font-extrabold text-red-700">{rechazados.length}</p><p className="text-xs font-semibold text-red-700">Rechazados</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-2xl font-extrabold text-emerald-700">{enviados}/{emitidos.length}</p><p className="text-xs font-semibold text-emerald-700">Enviados al cliente ✅</p></div>
      </div>

      {/* Rechazados por el SII/emisor */}
      {rechazados.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-red-600">❌ Rechazados ({rechazados.length})</h2>
          <div className="space-y-2">
            {rechazados.map((d) => (
              <div key={d.id} className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-800">{tipoDocumentoLabel[d.tipo] ?? d.tipo} · {d.negocio.razonSocial || d.negocio.nombreNegocio} · {fmtCLP(Number(d.montoTotal))}</span>
                  <form action={reintentarEmision}>
                    <input type="hidden" name="documentoId" value={d.id} />
                    <button className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white active:brightness-95">🔁 Reintentar</button>
                  </form>
                </div>
                {d.mensajeError && <p className="mt-1 text-xs text-red-700">{d.mensajeError}</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Facturas por emitir */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">Facturas por emitir ({factPendientes.length})</h2>
      {factPendientes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Nada pendiente. 🎉</p>
      ) : (
        <div className="space-y-2">
          {conRut.map((d) => (
            <div key={d.id} className="space-y-1">
              <FacturaPendiente ventaId={d.venta.id} total={Number(d.montoTotal)} fecha={fmt(d.venta.fecha)}
                cliente={{ nombre: d.negocio.nombreNegocio, rut: d.negocio.rut, razonSocial: d.negocio.razonSocial, giro: d.negocio.giro, dir: d.negocio.direccionFacturacion, email: d.negocio.emailFacturacion, tel: d.negocio.whatsapp }}
                items={d.venta.items.map((i) => ({ nombre: i.nombre, cantidad: i.cantidad, precioUnit: Number(i.precioUnit) }))} />
              {autoOn && (
                <form action={reintentarEmision} className="text-right">
                  <input type="hidden" name="documentoId" value={d.id} />
                  <button className="text-xs font-bold text-sky-700">⚡ Emitir electrónicamente ahora</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {sinRut.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          ⚠️ {sinRut.length} factura(s) de cliente <b>sin RUT</b>. Agrega RUT, razón social y giro en la ficha del cliente para poder emitirlas.
        </div>
      )}

      {/* Boletas pendientes de emisión electrónica */}
      {boletasPendientes.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          <span>🧾 <b>{boletasPendientes.length}</b> boleta(s) aún sin folio electrónico{autoOn ? "" : " (se emitirán al activar la emisión automática, o regístralas en tu app SII)"}.</span>
          {autoOn && (
            <form action={reintentarPendientes}>
              <button className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white active:brightness-95">⚡ Reintentar todas</button>
            </form>
          )}
        </div>
      )}

      {/* Guía para activar la emisión automática */}
      <details className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm" open={!autoOn}>
        <summary className="cursor-pointer font-bold text-slate-700">⚡ Activar emisión automática (boleta/factura al SII con un clic)</summary>
        <div className="mt-2 space-y-2 text-slate-600">
          <p>La app ya está cableada (webhook → LibreDTE → SII → folio y PDF de vuelta). Para encenderla faltan 3 cosas:</p>
          <ol className="list-decimal space-y-1 pl-5">
            <li><b>Certificado digital (.pfx)</b> + su contraseña — se carga dentro de LibreDTE, nunca en esta app.</li>
            <li><b>Folios CAF</b> de boleta (39) y factura (33), descargados desde el sitio del SII.</li>
            <li>Instancia de <b>LibreDTE</b> (está el docker-compose en <code>libredte/</code>) + activar el flujo n8n <code>workflow-facturacion-libredte.json</code> y las variables <code>SII_N8N_WEBHOOK_URL</code>, <code>SII_N8N_WEBHOOK_TOKEN</code> y <code>SII_WEBHOOK_TOKEN</code> en el servidor.</li>
          </ol>
          <p className="text-xs text-slate-500">🔒 Certificado, contraseña y folios viven solo en LibreDTE/servidor. Primero se prueba en ambiente de certificación del SII y después se pasa a producción.</p>
        </div>
      </details>

      {/* Emitidos: enviar al cliente y dejar registro del envío */}
      {emitidos.length > 0 && (
        <>
          <h2 className="mb-1 mt-7 text-sm font-bold uppercase tracking-wide text-slate-500">Emitidos · enviar al cliente ({enviados}/{emitidos.length} enviados)</h2>
          <p className="mb-2 text-xs text-slate-400">Al tocar “Enviar” queda registrado aquí como enviado (fecha + canal), aunque tu teléfono no muestre los mensajes enviados.</p>
          <div className="space-y-2">
            {emitidos.slice(0, 60).map((d) => {
              const nombre = d.negocio.razonSocial || d.negocio.nombreNegocio;
              const label = tipoDocumentoLabel[d.tipo] ?? d.tipo;
              const pdfPublico = d.urlPdf && d.urlPdf.startsWith("http") ? d.urlPdf : null;
              return (
                <div key={d.id} className={`rounded-xl border p-3 ${d.fechaEnvio ? "border-emerald-200 bg-emerald-50/40" : "border-orange-200 bg-orange-50/40"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{label} · {nombre}</p>
                      <p className="text-xs text-slate-500">{fmtCLP(Number(d.montoTotal))}{d.folio ? ` · folio ${d.folio}` : ""} · {fmt(d.venta.fecha)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {pdfPublico && <a href={pdfPublico} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">📎 PDF</a>}
                      {d.tipo === "factura" && (
                        <form action={desmarcarFacturada}><input type="hidden" name="ventaId" value={d.venta.id} /><button className="text-[11px] font-semibold text-slate-400">deshacer</button></form>
                      )}
                    </div>
                  </div>
                  <div className="mt-2">
                    <EnviarFactura
                      ventaId={d.venta.id}
                      nombre={nombre}
                      total={Number(d.montoTotal)}
                      folio={d.folio}
                      label={label}
                      whatsapp={d.negocio.whatsapp || null}
                      email={d.negocio.emailFacturacion || null}
                      enviadaEn={d.fechaEnvio ? fmtHora(d.fechaEnvio) : null}
                      canal={d.canalEnvio ?? null}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">📎 El mensaje lleva el enlace a la factura. “Enviado” = tú lo mandaste; que el cliente lo abra o no es cosa de él.</p>
        </>
      )}
    </div>
  );
}
