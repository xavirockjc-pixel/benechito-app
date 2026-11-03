import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { desmarcarFacturada } from "./actions";
import FacturaPendiente from "./FacturaPendiente";
import EnviarFactura from "./EnviarFactura";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
const fmtHora = (d: Date) => new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function FacturacionPage() {
  // Ventas con documento factura (o cliente con RUT) que aún no se han facturado.
  const ventas = await prisma.venta.findMany({
    where: { OR: [{ documento: "factura" }, { negocio: { rut: { not: null } } }] },
    orderBy: { fecha: "desc" },
    take: 200,
    include: {
      negocio: { select: { nombreNegocio: true, rut: true, razonSocial: true, giro: true, direccionFacturacion: true, emailFacturacion: true, whatsapp: true } },
    },
  });

  const pendientes = ventas.filter((v) => !v.facturada && v.negocio.rut);
  const sinRut = ventas.filter((v) => v.documento === "factura" && !v.negocio.rut && !v.facturada);
  const emitidas = ventas.filter((v) => v.facturada);
  const totalPend = pendientes.reduce((s, v) => s + Number(v.total), 0);

  // Estado de envío de cada factura emitida (último documento de la venta).
  const docs = emitidas.length
    ? await prisma.documentoVenta.findMany({
        where: { ventaId: { in: emitidas.map((v) => v.id) } },
        orderBy: { createdAt: "desc" },
        select: { ventaId: true, fechaEnvio: true, canalEnvio: true },
      })
    : [];
  const envioDe = new Map<string, { fechaEnvio: Date | null; canalEnvio: string | null }>();
  for (const d of docs) if (!envioDe.has(d.ventaId)) envioDe.set(d.ventaId, { fechaEnvio: d.fechaEnvio, canalEnvio: d.canalEnvio });

  const enviadas = emitidas.filter((v) => envioDe.get(v.id)?.fechaEnvio);
  const porEnviar = emitidas.filter((v) => !envioDe.get(v.id)?.fechaEnvio);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🧾 Facturación</h1>
      <p className="text-sm text-slate-500">
        Recordatorio de facturas por emitir y <b>registro de envío al cliente</b>: cuando mandas la factura, queda marcada como enviada aquí (aunque tu teléfono no muestre los mensajes enviados).
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-2xl font-extrabold text-amber-700">{pendientes.length}</p><p className="text-xs font-semibold text-amber-700">Por facturar</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-2xl font-extrabold text-slate-900">{fmtCLP(totalPend)}</p><p className="text-xs font-semibold text-slate-500">Monto pendiente</p></div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4"><p className="text-2xl font-extrabold text-orange-700">{porEnviar.length}</p><p className="text-xs font-semibold text-orange-700">Sin enviar al cliente</p></div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-2xl font-extrabold text-emerald-700">{enviadas.length}</p><p className="text-xs font-semibold text-emerald-700">Enviadas ✅</p></div>
      </div>

      {/* Por facturar */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">Por facturar ({pendientes.length})</h2>
      {pendientes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Nada pendiente. 🎉</p>
      ) : (
        <div className="space-y-2">
          {pendientes.map((v) => (
            <FacturaPendiente key={v.id} ventaId={v.id} total={Number(v.total)} fecha={fmt(v.fecha)}
              cliente={{ nombre: v.negocio.nombreNegocio, rut: v.negocio.rut, razonSocial: v.negocio.razonSocial, giro: v.negocio.giro, dir: v.negocio.direccionFacturacion, email: v.negocio.emailFacturacion }} />
          ))}
        </div>
      )}

      {sinRut.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          ⚠️ {sinRut.length} venta(s) con factura pero <b>sin RUT</b> del cliente. Agrega el RUT en la ficha del cliente para poder facturar.
        </div>
      )}

      {/* Facturas emitidas: ¿se enviaron al cliente? */}
      {emitidas.length > 0 && (
        <>
          <h2 className="mb-1 mt-7 text-sm font-bold uppercase tracking-wide text-slate-500">Enviar al cliente ({emitidas.length})</h2>
          <p className="mb-2 text-xs text-slate-400">Toca “Enviar” para mandar la factura. Queda registrada como enviada con fecha y canal.</p>
          <div className="space-y-2">
            {emitidas.slice(0, 60).map((v) => {
              const nombre = v.negocio.razonSocial || v.negocio.nombreNegocio;
              const env = envioDe.get(v.id);
              return (
                <div key={v.id} className={`rounded-xl border p-3 ${env?.fechaEnvio ? "border-emerald-200 bg-emerald-50/40" : "border-orange-200 bg-orange-50/40"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-800">{nombre}</p>
                      <p className="text-xs text-slate-500">{fmtCLP(Number(v.total))}{v.folioFactura ? ` · folio ${v.folioFactura}` : ""} · {fmt(v.fecha)}</p>
                    </div>
                    <form action={desmarcarFacturada}><input type="hidden" name="ventaId" value={v.id} /><button className="text-[11px] font-semibold text-slate-400">deshacer</button></form>
                  </div>
                  <div className="mt-2">
                    <EnviarFactura
                      ventaId={v.id}
                      nombre={nombre}
                      total={Number(v.total)}
                      folio={v.folioFactura}
                      whatsapp={v.negocio.whatsapp || null}
                      email={v.negocio.emailFacturacion || null}
                      enviadaEn={env?.fechaEnvio ? fmtHora(env.fechaEnvio) : null}
                      canal={env?.canalEnvio ?? null}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">📎 El mensaje lleva un enlace a la factura. “Enviada” = tú la mandaste; que el cliente la abra o no es cosa de él.</p>
        </>
      )}

      {/* Emisión electrónica: preparado, pendiente de proveedor */}
      <details className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <summary className="cursor-pointer font-bold text-slate-700">⚡ Emisión electrónica (boleta/factura) — preparado</summary>
        <div className="mt-2 space-y-2 text-slate-600">
          <p>Hoy esto funciona como <b>recordatorio + registro de folio y envío</b>. Para emitir con un clic hacia el SII falta enchufar un <b>proveedor DTE</b>. Cuando lo decidas, se conecta aquí mismo.</p>
          <p className="font-semibold text-slate-700">Para activarlo necesitarás:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Elegir proveedor (ej: LibreDTE, Bsale) o certificado propio del SII.</li>
            <li>Tu <b>certificado digital</b> y los <b>folios (CAF)</b> autorizados por el SII.</li>
            <li>El <b>RUT y giro</b> del negocio y de cada cliente que reciba factura.</li>
          </ul>
          <p className="text-xs text-slate-500">🔒 Las claves y el certificado los cargas tú en la configuración del servidor; el sistema nunca los expone.</p>
        </div>
      </details>
    </div>
  );
}
