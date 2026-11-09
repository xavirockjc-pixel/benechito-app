import Link from "next/link";
import CatalogoVenta from "../CatalogoVenta";

export const dynamic = "force-dynamic";

// Zonas de precio del catálogo del vendedor (precio por sector).
const ZONAS = [
  { z: "coronel_lota", l: "📍 Coronel · Lota" },
  { z: "metropolitano", l: "📍 San Pedro · Conce" },
  { z: "los_angeles", l: "📍 Sta. Juana · L. Ángeles" },
];

export default async function VentaRapidaPage({ searchParams }: { searchParams: Promise<{ error?: string; zona?: string }> }) {
  const { error, zona } = await searchParams;
  const zonaSel = ZONAS.some((x) => x.z === zona) ? zona! : "coronel_lota";
  return (
    <div>
      <Link href="/vendedor" className="text-sm font-semibold text-[#1479c4]">← Inicio</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">🛍️ Catálogo / Vender</h1>
      <p className="text-xs text-slate-500">Elige la zona para ver los precios de ese sector, muéstralo al cliente y cierra la venta.</p>

      {error === "factura" && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
          ⚠️ No se pudo cerrar como factura: elige un cliente registrado con RUT, razón social y giro.
        </p>
      )}

      {/* Selector de zona (precio por sector) */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ZONAS.map((x) => (
          <Link key={x.z} href={`/vendedor/venta-rapida?zona=${x.z}`}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold ${zonaSel === x.z ? "border-[#1479c4] bg-blue-50 text-[#1479c4]" : "border-slate-200 bg-white text-slate-500"}`}>{x.l}</Link>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-slate-400">💡 Al vender desde la ficha del cliente, el precio sale solo por su zona.</p>

      <div className="mt-3"><CatalogoVenta zona={zonaSel} /></div>
    </div>
  );
}
