import Link from "next/link";
import VentaMano from "./VentaMano";

export const dynamic = "force-dynamic";

/**
 * Venta a mano / particular: registrar una venta por MONTO (sin elegir producto),
 * con nota, forma de pago (efectivo / transferencia / débito) y, opcional, guardar
 * un cliente particular.
 */
export default async function VentaManoPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-lg">
      <Link href="/vendedor" className="text-sm font-semibold text-[#1479c4]">← Inicio</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">✍️ Venta a mano</h1>
      <p className="text-xs text-slate-500">Solo el monto y el pago, sin elegir producto. Para ventas particulares o rápidas.</p>

      {error === "monto" && <p className="mt-3 rounded-xl bg-amber-100 px-4 py-2.5 text-center text-sm font-bold text-amber-700">Pon un monto mayor a 0.</p>}
      {error === "ubicacion" && <p className="mt-3 rounded-xl bg-amber-100 px-4 py-2.5 text-center text-sm font-bold text-amber-700">No hay ubicación/caja configurada para registrar la venta.</p>}

      <div className="mt-4">
        <VentaMano />
      </div>
    </div>
  );
}
