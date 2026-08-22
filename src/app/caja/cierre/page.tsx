import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { medioPagoLabel } from "@/lib/dominio/ventas";
import { movimientoCaja, sesionAbierta } from "../actions";
import CierreCajaForm from "./CierreCajaForm";

export const dynamic = "force-dynamic";

export default async function CierreCajaPage() {
  const sesion = await sesionAbierta();
  if (!sesion) {
    return (
      <div className="mx-auto max-w-sm text-center">
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
          No hay una caja abierta. <Link href="/caja" className="font-semibold text-[#0f7a44]">Volver</Link>
        </p>
      </div>
    );
  }

  const [ventas, movimientos] = await Promise.all([
    prisma.venta.findMany({ where: { sesionCajaId: sesion.id }, include: { pagos: true } }),
    prisma.movimientoCaja.findMany({ where: { sesionCajaId: sesion.id }, orderBy: { fecha: "desc" } }),
  ]);

  // Dinero por medio
  const porMedio: Record<string, number> = {};
  for (const v of ventas) for (const p of v.pagos) porMedio[p.medio] = (porMedio[p.medio] ?? 0) + Number(p.monto);
  const efectivoVentas = porMedio["efectivo"] ?? 0;
  const fondo = Number(sesion.fondoInicial);
  const ingresos = movimientos.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + Number(m.monto), 0);
  const egresos = movimientos.filter((m) => m.tipo === "egreso").reduce((s, m) => s + Number(m.monto), 0);
  const esperado = fondo + efectivoVentas + ingresos - egresos;
  const otrosMedios = Object.entries(porMedio).filter(([m]) => m !== "efectivo");

  return (
    <div className="mx-auto max-w-md">
      <Link href="/caja" className="text-sm font-semibold text-[#0f7a44]">← Volver a vender</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">Cerrar caja</h1>

      {/* Resumen del día */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-sm">
        <h2 className="mb-2 font-bold text-slate-900">Resumen</h2>
        <Row label="Fondo inicial" valor={fmtCLP(fondo)} />
        <Row label="Ventas en efectivo" valor={fmtCLP(efectivoVentas)} />
        {otrosMedios.map(([m, v]) => <Row key={m} label={`Ventas ${medioPagoLabel[m] ?? m}`} valor={fmtCLP(v)} />)}
        {ingresos > 0 && <Row label="Ingresos de caja" valor={fmtCLP(ingresos)} />}
        {egresos > 0 && <Row label="Retiros / egresos" valor={`- ${fmtCLP(egresos)}`} />}
      </section>

      {/* Retiro rápido de efectivo */}
      <details className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm text-sm">
        <summary className="cursor-pointer font-semibold text-slate-700">💸 Registrar un retiro de la caja</summary>
        <form action={movimientoCaja} className="mt-2 grid grid-cols-[1fr_auto_auto] items-end gap-2">
          <input type="hidden" name="tipo" value="egreso" />
          <label className="text-xs font-bold text-slate-600">Concepto
            <input name="concepto" required placeholder="Ej: pago flete" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">Monto
            <input type="number" name="monto" min="1" step="1" inputMode="numeric" className="mt-1 w-24 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <button className="rounded-lg bg-slate-700 px-3 py-2 text-sm font-bold text-white">Registrar</button>
        </form>
      </details>

      {/* Arqueo */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-bold text-slate-900">Arqueo</h2>
        <CierreCajaForm esperado={esperado} />
      </section>
    </div>
  );
}

function Row({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{valor}</span>
    </div>
  );
}
