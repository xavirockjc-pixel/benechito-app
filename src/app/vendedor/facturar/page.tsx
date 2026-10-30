import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import EmitirSII from "@/app/_shared/EmitirSII";
import MarcarFactura from "./MarcarFactura";

export const dynamic = "force-dynamic";

const SII_URL = process.env.SII_EMITIR_URL || "https://www.sii.cl/servicios_online/1039-.html";
const fmtDia = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });
const waNum = (w: string) => { const d = (w || "").replace(/\D/g, ""); return d.startsWith("56") ? d : d.length === 9 ? "56" + d : d; };

// Pantalla del vendedor: ventas que quedaron para FACTURAR (modo manual). Muestra
// la venta, el RUT del cliente y los netos para copiar en e-Factura, y permite
// enviarle la factura al cliente por WhatsApp apenas se emite.
export default async function FacturarVendedor() {
  const docs = await prisma.documentoVenta.findMany({
    where: { tipo: "factura", estado: "pendiente", venta: { is: { facturada: false } } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      venta: { select: { id: true, total: true, fecha: true, items: { select: { nombre: true, cantidad: true, precioUnit: true } } } },
      negocio: { select: { id: true, nombreNegocio: true, razonSocial: true, rut: true, giro: true, whatsapp: true } },
    },
  });

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/vendedor" className="text-sm font-semibold text-[#1479c4]">← Inicio</Link>
          <h1 className="mt-1 text-xl font-extrabold text-slate-900">🧾 Por facturar</h1>
          <p className="text-xs text-slate-500">Ventas que quedaron para hacerles la factura. Copia los datos, hazla en e-Factura y envíasela al cliente.</p>
        </div>
        <span className="rounded-full bg-[#0891b2] px-3 py-1 text-sm font-extrabold text-white">{docs.length}</span>
      </div>

      {docs.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          ✅ No hay ventas pendientes de facturar.
        </p>
      )}

      {docs.map((d) => {
        const total = Number(d.montoTotal ?? d.venta.total);
        const neto = d.montoNeto != null ? Math.round(Number(d.montoNeto)) : Math.round(total / 1.19);
        const iva = d.iva != null ? Math.round(Number(d.iva)) : total - neto;
        const nombre = d.negocio.razonSocial || d.negocio.nombreNegocio;
        const sinRut = !d.negocio.rut;

        const lineasNeto = d.venta.items.map((i) => {
          const netoUnit = Math.round(Number(i.precioUnit) / 1.19);
          return { nombre: i.nombre, cantidad: i.cantidad, netoUnit, netoTotal: netoUnit * i.cantidad };
        });
        const detalleSII = lineasNeto.length > 0
          ? lineasNeto.map((l) => `${l.cantidad} x ${l.nombre} — neto ${fmtCLP(l.netoUnit)} c/u`).join("\n")
          : `Venta — Neto ${fmtCLP(neto)}`;
        const datosSII = [
          { label: "RUT comprador", value: d.negocio.rut || "— (falta: agrégalo en el cliente)" },
          { label: "Razón social", value: nombre },
          ...(d.negocio.giro ? [{ label: "Giro", value: d.negocio.giro }] : []),
          { label: "Neto", value: fmtCLP(neto) },
          { label: "IVA (19%)", value: fmtCLP(iva) },
          { label: "Total", value: fmtCLP(total) },
        ];

        const msgCliente = `Hola ${nombre} 👋, te hago llegar tu factura de Benechito 🐝 por ${fmtCLP(total)}. ¡Gracias por tu compra!`;
        const wa = d.negocio.whatsapp ? `https://wa.me/${waNum(d.negocio.whatsapp)}?text=${encodeURIComponent(msgCliente)}` : null;

        return (
          <div key={d.id} className="space-y-2 rounded-2xl border-2 border-amber-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-extrabold text-slate-900">{nombre}</p>
                <p className="text-xs text-slate-500">
                  RUT {d.negocio.rut || "—"}{d.negocio.whatsapp ? ` · 📞 ${d.negocio.whatsapp}` : ""} · {fmtDia(d.venta.fecha)}
                </p>
              </div>
              <span className="shrink-0 text-right text-sm font-extrabold text-slate-900">{fmtCLP(total)}</span>
            </div>

            {sinRut && (
              <Link href={`/vendedor/cliente/${d.negocio.id}`} className="block rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600">
                ⚠️ Falta el RUT de este cliente — tócalo para agregarlo (✏️ Editar cliente)
              </Link>
            )}

            {/* Datos + netos para copiar + abrir e-Factura */}
            <EmitirSII url={SII_URL} datos={datosSII} detalle={detalleSII} lineas={lineasNeto} />

            {/* Marcar facturada + enviar al cliente (adjunta el PDF) desde el número central */}
            <MarcarFactura ventaId={d.venta.id} waFallback={wa} />
          </div>
        );
      })}

      <p className="text-center text-[11px] text-slate-400">
        WhatsApp abre con el mensaje listo; si tienes el PDF/pantallazo de la factura, adjúntalo en el chat.
      </p>
    </div>
  );
}
