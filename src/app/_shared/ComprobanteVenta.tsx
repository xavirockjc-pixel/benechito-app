import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { tipoDocumentoLabel, estadoDocumentoLabel, medioPagoLabel } from "@/lib/dominio/ventas";
import EnviarWhatsApp from "@/components/EnviarWhatsApp";

/**
 * Comprobante de una venta recién hecha (caja local y vendedor ruta):
 * detalle de productos, desglose IVA, estado del documento tributario
 * (boleta/factura electrónica) y envío por WhatsApp al cliente.
 */
export default async function ComprobanteVenta({ ventaId, volver, volverLabel }: {
  ventaId: string;
  volver: string;
  volverLabel: string;
}) {
  const venta = await prisma.venta.findUnique({
    where: { id: ventaId },
    include: {
      negocio: { select: { nombreNegocio: true, razonSocial: true, rut: true, whatsapp: true } },
      items: true,
      pagos: true,
      documentos: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  if (!venta) {
    return (
      <div className="mx-auto max-w-md">
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Venta no encontrada.</p>
        <Link href={volver} className="mt-3 block text-center text-sm font-bold text-[#0f7a44]">← {volverLabel}</Link>
      </div>
    );
  }

  const doc = venta.documentos[0] ?? null;
  const esDTE = doc && (doc.tipo === "boleta" || doc.tipo === "factura");
  const total = Number(venta.total);
  const pagado = venta.pagos.reduce((s, p) => s + Number(p.monto), 0);
  const deuda = Math.max(0, total - pagado);
  const nombreCliente = venta.negocio.razonSocial || venta.negocio.nombreNegocio;
  const esMostrador = venta.negocio.nombreNegocio === "Consumidor Final";
  const fecha = new Date(venta.fecha).toLocaleString("es-CL", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const pdfPublico = doc?.urlPdf && doc.urlPdf.startsWith("http") ? doc.urlPdf : null;

  // Mensaje de WhatsApp listo para enviar (editable en pantalla).
  const lineasTxt = venta.items.map((i) => `• ${i.cantidad}× ${i.nombre} — ${fmtCLP(Number(i.precioUnit) * i.cantidad)}`);
  const msg = [
    `🐝 *Benechito* — Comprobante de venta`,
    fecha,
    esMostrador ? null : `Cliente: ${nombreCliente}`,
    "",
    ...(lineasTxt.length > 0 ? [...lineasTxt, ""] : []),
    `*Total: ${fmtCLP(total)}*`,
    doc?.montoNeto != null ? `(Neto ${fmtCLP(Number(doc.montoNeto))} + IVA ${fmtCLP(Number(doc.iva ?? 0))})` : null,
    esDTE ? `${tipoDocumentoLabel[doc.tipo]} electrónica${doc.folio ? ` N° ${doc.folio}` : " (folio por confirmar)"}` : null,
    pdfPublico ? `PDF: ${pdfPublico}` : null,
    deuda > 0 ? `Saldo pendiente: ${fmtCLP(deuda)}` : null,
    "",
    "¡Gracias por tu compra! 🙌",
  ].filter((l): l is string => l !== null).join("\n");

  return (
    <div className="mx-auto max-w-md space-y-3">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <p className="text-3xl">✅</p>
        <h1 className="text-lg font-extrabold text-emerald-800">Venta registrada</h1>
        <p className="text-sm font-semibold text-emerald-700">{fmtCLP(total)}{esMostrador ? "" : ` · ${nombreCliente}`}</p>
      </div>

      {/* Documento tributario */}
      {doc && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">📄 {tipoDocumentoLabel[doc.tipo] ?? doc.tipo}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              doc.estado === "rechazado" ? "bg-red-100 text-red-700"
              : doc.estado === "pendiente" ? "bg-amber-100 text-amber-700"
              : "bg-green-100 text-green-700"}`}>
              {estadoDocumentoLabel[doc.estado] ?? doc.estado}{doc.folio ? ` · folio ${doc.folio}` : ""}
            </span>
          </div>
          {esDTE && doc.estado === "pendiente" && (
            <p className="mt-1.5 text-xs text-slate-500">
              El documento electrónico se emite aparte; el folio y el PDF aparecen en el panel de Facturación cuando estén listos.
            </p>
          )}
          {pdfPublico && (
            <a href={pdfPublico} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
              📎 Ver PDF
            </a>
          )}
        </div>
      )}

      {/* Detalle */}
      {venta.items.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <ul className="divide-y divide-slate-100 text-sm">
            {venta.items.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-1.5">
                <span className="min-w-0 truncate text-slate-700">{i.cantidad}× {i.nombre}</span>
                <span className="ml-2 shrink-0 font-semibold text-slate-900">{fmtCLP(Number(i.precioUnit) * i.cantidad)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
            <span className="font-bold text-slate-700">Total</span>
            <span className="text-lg font-extrabold text-slate-900">{fmtCLP(total)}</span>
          </div>
          {doc?.montoNeto != null && (
            <p className="text-right text-[11px] text-slate-400">Neto {fmtCLP(Number(doc.montoNeto))} + IVA {fmtCLP(Number(doc.iva ?? 0))}</p>
          )}
          {venta.pagos.length > 0 && (
            <p className="mt-1 text-right text-[11px] text-slate-400">
              Pago: {venta.pagos.map((p) => `${medioPagoLabel[p.medio] ?? p.medio} ${fmtCLP(Number(p.monto))}`).join(" · ")}
            </p>
          )}
          {deuda > 0 && <p className="text-right text-xs font-bold text-red-600">Queda debiendo {fmtCLP(deuda)}</p>}
        </div>
      )}

      <EnviarWhatsApp texto={msg} telefono={venta.negocio.whatsapp || undefined} />

      <Link href={volver} className="block rounded-xl bg-[#0f7a44] py-3 text-center text-base font-extrabold text-white shadow-sm active:brightness-110">
        {volverLabel}
      </Link>
    </div>
  );
}
