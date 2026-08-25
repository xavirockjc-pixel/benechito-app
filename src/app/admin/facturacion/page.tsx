import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { marcarFacturada, desmarcarFacturada } from "./actions";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });

export default async function FacturacionPage() {
  // Ventas con documento factura (o cliente con RUT) que aún no se han facturado.
  const ventas = await prisma.venta.findMany({
    where: { OR: [{ documento: "factura" }, { negocio: { rut: { not: null } } }] },
    orderBy: { fecha: "desc" },
    take: 200,
    include: { negocio: { select: { nombreNegocio: true, rut: true, razonSocial: true } } },
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
            <div key={v.id} className="rounded-2xl border-2 border-amber-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-extrabold text-slate-900">{v.negocio.razonSocial || v.negocio.nombreNegocio}</p>
                  <p className="text-xs text-slate-500">RUT {v.negocio.rut} · {fmt(v.fecha)} · <b className="text-slate-800">{fmtCLP(Number(v.total))}</b></p>
                </div>
              </div>
              <form action={marcarFacturada} className="mt-3 flex items-end gap-2">
                <input type="hidden" name="ventaId" value={v.id} />
                <label className="text-xs font-bold text-slate-600">Folio (opcional)
                  <input name="folio" placeholder="N° factura" className="mt-1 block w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
                </label>
                <button className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white active:brightness-95">✓ Marcar facturada</button>
              </form>
            </div>
          ))}
        </div>
      )}

      {sinRut.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          ⚠️ {sinRut.length} venta(s) con factura pero <b>sin RUT</b> del cliente. Agrega el RUT en la ficha del cliente para poder facturar.
        </div>
      )}

      {/* Emitidas */}
      {emitidas.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">Emitidas ({emitidas.length})</h2>
          <div className="space-y-1">
            {emitidas.slice(0, 40).map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2.5 text-sm">
                <span className="truncate font-semibold text-slate-600">{v.negocio.razonSocial || v.negocio.nombreNegocio} · {fmtCLP(Number(v.total))}{v.folioFactura ? ` · folio ${v.folioFactura}` : ""}</span>
                <form action={desmarcarFacturada}><input type="hidden" name="ventaId" value={v.id} /><button className="ml-2 shrink-0 text-xs font-semibold text-slate-400">deshacer</button></form>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
