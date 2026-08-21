import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { MEDIOS_PAGO, medioPagoLabel } from "@/lib/dominio/ventas";
import { registrarCobro } from "../../../actions";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short" });

export default async function CobrarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await prisma.negocio.findUnique({
    where: { id },
    include: { ventas: { include: { pagos: true }, orderBy: { fecha: "asc" } } },
  });
  if (!cliente) notFound();

  const pendientes = cliente.ventas
    .map((v) => ({ ...v, saldo: Number(v.total) - v.pagos.reduce((a, p) => a + Number(p.monto), 0) }))
    .filter((v) => v.saldo > 0);

  return (
    <div>
      <Link href={`/vendedor/cliente/${id}`} className="text-sm font-semibold text-[#1479c4]">← {cliente.nombreNegocio}</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">Cobrar</h1>

      {pendientes.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Este cliente no tiene deudas. 🎉
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {pendientes.map((v) => (
            <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Venta {fmtFecha(v.fecha)}</span>
                <span className="font-extrabold text-red-600">Debe {fmtCLP(v.saldo)}</span>
              </div>
              <form action={registrarCobro} className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <input type="hidden" name="ventaId" value={v.id} />
                <input type="hidden" name="negocioId" value={id} />
                <label className="text-xs font-bold text-slate-600">Medio
                  <select name="medio" defaultValue="efectivo" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm">
                    {MEDIOS_PAGO.filter((m) => m !== "credito").map((m) => <option key={m} value={m}>{medioPagoLabel[m]}</option>)}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-600">Monto
                  <input type="number" name="monto" min="1" step="1" defaultValue={v.saldo} inputMode="numeric" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" />
                </label>
                <button className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white">Abonar</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
