import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { site } from "@/lib/config";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const TIPO: Record<string, string> = { factura: "Factura", boleta: "Boleta", nota_credito: "Nota de crédito", guia_despacho: "Guía de despacho", nota_venta: "Nota de venta" };

/**
 * Página pública de la factura: el enlace que se le manda al cliente por WhatsApp
 * para que reciba el documento. No rastrea si la abrió (eso es del cliente).
 */
export default async function FacturaPublicaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await prisma.documentoVenta.findUnique({
    where: { enlaceToken: token },
    include: { negocio: { select: { nombreNegocio: true, razonSocial: true, rut: true } } },
  });
  if (!doc) notFound();

  const total = Number(doc.montoTotal);
  const neto = doc.montoNeto != null ? Number(doc.montoNeto) : Math.round(total / 1.19);
  const iva = doc.iva != null ? Number(doc.iva) : total - neto;
  const nombre = doc.negocio.razonSocial || doc.negocio.nombreNegocio;
  const fecha = (doc.fechaEmision ?? doc.createdAt).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" });
  const esImagen = (doc.urlPdf ?? "").startsWith("data:image");
  const esPdf = !!doc.urlPdf && !esImagen;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-md overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="bg-[#1479c4] px-5 py-6 text-center text-white">
          <img src="/marca/logo.png" alt={site.nombre} className="mx-auto h-12 w-auto" />
          <p className="mt-3 text-sm font-semibold text-white/85">{TIPO[doc.tipo] ?? "Documento"} electrónica</p>
          {doc.folio && <p className="text-2xl font-extrabold">N° {doc.folio}</p>}
        </div>

        <div className="space-y-4 px-5 py-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Cliente</p>
            <p className="font-extrabold text-slate-900">{nombre}</p>
            {doc.negocio.rut && <p className="text-xs text-slate-500">RUT {doc.negocio.rut}</p>}
            <p className="text-xs text-slate-500">{fecha}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
            <div className="flex justify-between text-sm text-slate-600"><span>Neto</span><span>{CLP(neto)}</span></div>
            <div className="flex justify-between text-sm text-slate-600"><span>IVA (19%)</span><span>{CLP(iva)}</span></div>
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-base font-extrabold text-slate-900"><span>Total</span><span>{CLP(total)}</span></div>
          </div>

          {esImagen && (
            <a href={doc.urlPdf!} download={`factura-${doc.folio ?? doc.id}.jpg`} className="block">
              <img src={doc.urlPdf!} alt="Factura" className="w-full rounded-xl ring-1 ring-slate-200" />
              <span className="mt-2 block rounded-xl bg-[#1479c4] py-3 text-center text-sm font-extrabold text-white">⬇️ Descargar factura</span>
            </a>
          )}
          {esPdf && (
            <a href={doc.urlPdf!} target="_blank" rel="noopener noreferrer" className="block rounded-xl bg-[#1479c4] py-3 text-center text-sm font-extrabold text-white">
              📄 Ver / descargar factura (PDF)
            </a>
          )}
          {!doc.urlPdf && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
              Tu factura está emitida. El documento te llegará en breve.
            </p>
          )}

          <p className="pt-2 text-center text-[11px] text-slate-400">
            {site.nombre} 🐝 · {site.web}<br />¡Gracias por tu compra!
          </p>
        </div>
      </div>
    </div>
  );
}
