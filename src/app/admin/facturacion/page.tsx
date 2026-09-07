import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { desmarcarFacturada } from "./actions";
import FacturaPendiente from "./FacturaPendiente";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });
const waNum = (w: string) => { const d = (w || "").replace(/\D/g, ""); return d.startsWith("56") ? d : d.length === 9 ? "56" + d : d; };

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

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🧾 Facturación</h1>
      <p className="text-sm text-slate-500">
        Recordatorio de facturas por emitir: ventas de clientes con RUT que compran con factura. Se dejará listo para enlazar con el SII/tu emisor.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="text-2xl font-extrabold text-amber-700">{pendientes.length}</p><p className="text-xs font-semibold text-amber-700">Por facturar</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-2xl font-extrabold text-slate-900">{fmtCLP(totalPend)}</p><p className="text-xs font-semibold text-slate-500">Monto pendiente</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-2xl font-extrabold text-green-700">{emitidas.length}</p><p className="text-xs font-semibold text-slate-500">Emitidas</p></div>
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

      {/* Emisión electrónica: preparado, pendiente de proveedor */}
      <details className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
        <summary className="cursor-pointer font-bold text-slate-700">⚡ Emisión electrónica (boleta/factura) — preparado</summary>
        <div className="mt-2 space-y-2 text-slate-600">
          <p>Hoy esto funciona como <b>recordatorio + registro de folio</b>. Para emitir con un clic hacia el SII falta enchufar un <b>proveedor DTE</b>. Cuando lo decidas, se conecta aquí mismo.</p>
          <p className="font-semibold text-slate-700">Para activarlo necesitarás:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Elegir proveedor (ej: LibreDTE, Bsale) o certificado propio del SII.</li>
            <li>Tu <b>certificado digital</b> y los <b>folios (CAF)</b> autorizados por el SII.</li>
            <li>El <b>RUT y giro</b> del negocio y de cada cliente que reciba factura.</li>
          </ul>
          <p className="text-xs text-slate-500">🔒 Las claves y el certificado los cargas tú en la configuración del servidor; el sistema nunca los expone.</p>
        </div>
      </details>

      {/* Emitidas */}
      {emitidas.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">Emitidas ({emitidas.length})</h2>
          <div className="space-y-1.5">
            {emitidas.slice(0, 40).map((v) => {
              const nombre = v.negocio.razonSocial || v.negocio.nombreNegocio;
              const msg = `Hola ${nombre} 👋, aquí está tu factura${v.folioFactura ? ` N° ${v.folioFactura}` : ""} por ${fmtCLP(Number(v.total))} de Benechito 🐝. ¡Gracias!`;
              const wa = v.negocio.whatsapp ? `https://wa.me/${waNum(v.negocio.whatsapp)}?text=${encodeURIComponent(msg)}` : null;
              const mail = v.negocio.emailFacturacion ? `mailto:${v.negocio.emailFacturacion}?subject=${encodeURIComponent("Tu factura Benechito")}&body=${encodeURIComponent(msg)}` : null;
              return (
                <div key={v.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold text-slate-600">{nombre} · {fmtCLP(Number(v.total))}{v.folioFactura ? ` · folio ${v.folioFactura}` : ""}</span>
                  {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">📲 WhatsApp</a>}
                  {mail && <a href={mail} className="shrink-0 rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-bold text-white">✉️ Email</a>}
                  <form action={desmarcarFacturada}><input type="hidden" name="ventaId" value={v.id} /><button className="shrink-0 text-xs font-semibold text-slate-400">deshacer</button></form>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">📎 El mensaje va listo; adjunta el PDF de la factura (el que bajas del SII) al enviarlo. Cuando conectemos un proveedor DTE, se enviará solo con el PDF.</p>
        </>
      )}
    </div>
  );
}
