import Link from "next/link";
import { filasCierreStock } from "@/app/_shared/cierreStock";
import CierreGuiado from "@/app/_shared/CierreGuiado";

export const dynamic = "force-dynamic";

export default async function CierreStockLocal({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const filas = await filasCierreStock("sala");

  return (
    <div className="mx-auto max-w-md">
      <Link href="/caja/cierre" className="text-sm font-semibold text-[#0f7a44]">← Cierre de caja (dinero)</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">🧾 Cierre de mercadería</h1>
      <p className="text-xs text-slate-500">Cuenta lo que quedó en la sala y cuadra contra lo que debería quedar. Lo que falte queda registrado como merma.</p>

      {ok && <p className="mt-3 rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Cierre guardado</p>}

      <div className="mt-4">
        {filas.length === 0
          ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No hay productos para contar.</p>
          : <CierreGuiado filas={filas} zona="sala" acento="#0f7a44" />}
      </div>
    </div>
  );
}
