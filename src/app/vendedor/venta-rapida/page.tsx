import Link from "next/link";
import CatalogoVenta from "../CatalogoVenta";

export const dynamic = "force-dynamic";

export default async function VentaRapidaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div>
      <Link href="/vendedor" className="text-sm font-semibold text-[#1479c4]">← Inicio</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">🛍️ Catálogo / Vender</h1>
      <p className="text-xs text-slate-500">Muéstralo al cliente, elige por voz o tocando, y cierra la venta.</p>

      {error === "factura" && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
          ⚠️ No se pudo cerrar como factura: elige un cliente registrado con RUT, razón social y giro.
        </p>
      )}

      <div className="mt-3"><CatalogoVenta /></div>
    </div>
  );
}
