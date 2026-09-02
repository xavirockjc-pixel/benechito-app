import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { actualizarNegocio } from "../../actions";
import UbicacionGPS from "./UbicacionGPS";

export const dynamic = "force-dynamic";

const tipos = ["Almacén", "Minimarket", "Kiosco", "Botillería", "Panadería", "Cafetería", "Food truck", "Otro"];
const inputCls =
  "mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30";

export default async function EditarNegocio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const n = await prisma.negocio.findUnique({ where: { id } });
  if (!n) notFound();

  return (
    <div>
      <Link href={`/admin/negocios/${n.id}`} className="text-sm font-semibold text-naranja">
        ← Volver a la ficha
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-navy">Editar cliente</h1>

      <form action={actualizarNegocio} className="mt-5 max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-crema-2">
        <input type="hidden" name="id" value={n.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold text-navy">Nombre de contacto *
            <input name="nombreContacto" required defaultValue={n.nombreContacto} className={inputCls} />
          </label>
          <label className="text-sm font-bold text-navy">Nombre del negocio *
            <input name="nombreNegocio" required defaultValue={n.nombreNegocio} className={inputCls} />
          </label>
          <label className="text-sm font-bold text-navy">WhatsApp
            <input name="whatsapp" defaultValue={n.whatsapp} className={inputCls} />
          </label>
          <label className="text-sm font-bold text-navy">Comuna
            <input name="comuna" defaultValue={n.comuna} className={inputCls} />
          </label>
          <label className="text-sm font-bold text-navy">Ciudad
            <input name="ciudad" defaultValue={n.ciudad ?? ""} className={inputCls} />
          </label>
          <label className="text-sm font-bold text-navy">Sector <span className="font-normal text-choco-2">(para la ruta)</span>
            <input name="sector" defaultValue={n.sector ?? ""} placeholder="Ej: Centro, Norte…" className={inputCls} />
          </label>
          <label className="text-sm font-bold text-navy">RUT <span className="font-normal text-choco-2">(para factura)</span>
            <input name="rut" defaultValue={n.rut ?? ""} placeholder="12.345.678-9" className={inputCls} />
          </label>
          <label className="text-sm font-bold text-navy">Razón social <span className="font-normal text-choco-2">(factura)</span>
            <input name="razonSocial" defaultValue={n.razonSocial ?? ""} className={inputCls} />
          </label>
          <label className="text-sm font-bold text-navy">Giro <span className="font-normal text-choco-2">(factura)</span>
            <input name="giro" defaultValue={n.giro ?? ""} placeholder="Ej: Comercio al por menor" className={inputCls} />
          </label>
          <label className="text-sm font-bold text-navy">Email de facturación <span className="font-normal text-choco-2">(recibe el PDF/XML)</span>
            <input name="emailFacturacion" type="email" defaultValue={n.emailFacturacion ?? ""} className={inputCls} />
          </label>
          <label className="text-sm font-bold text-navy">Dirección de facturación <span className="font-normal text-choco-2">(si difiere)</span>
            <input name="direccionFacturacion" defaultValue={n.direccionFacturacion ?? ""} className={inputCls} />
          </label>
          <label className="text-sm font-bold text-navy">Documento por defecto
            <select name="tipoDocumentoDefault" defaultValue={n.tipoDocumentoDefault ?? "boleta"} className={inputCls}>
              <option value="boleta">Boleta</option>
              <option value="factura">Factura</option>
              <option value="sin_documento">Sin documento</option>
            </select>
          </label>
          <label className="text-sm font-bold text-navy">Dirección
            <input name="direccion" defaultValue={n.direccion ?? ""} className={inputCls} />
          </label>
          <label className="text-sm font-bold text-navy">Tipo de negocio
            <select name="tipoNegocio" defaultValue={n.tipoNegocio ?? ""} className={inputCls}>
              <option value="">—</option>
              {tipos.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>

        <UbicacionGPS defaultLat={n.latitud} defaultLng={n.longitud} />

        <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-navy">
          <input type="checkbox" name="interesHelados" value="si" defaultChecked={n.interesHelados} className="h-5 w-5 accent-naranja" />
          Interesado en helados 🍦
        </label>

        <label className="mt-4 block text-sm font-bold text-navy">Observaciones
          <textarea name="observaciones" rows={3} defaultValue={n.observaciones ?? ""} className={inputCls} />
        </label>

        <button className="mt-5 rounded-full bg-naranja px-6 py-2.5 font-bold text-white shadow-md transition hover:bg-naranja-2">
          Guardar cambios
        </button>
      </form>
    </div>
  );
}
