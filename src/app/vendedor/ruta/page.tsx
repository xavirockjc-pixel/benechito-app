import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RutaSugerida from "./RutaSugerida";

export const dynamic = "force-dynamic";

export default async function RutaPage() {
  const clientes = await prisma.negocio.findMany({
    orderBy: { nombreNegocio: "asc" },
    include: { ventas: { select: { total: true, pagos: { select: { monto: true } } } } },
  });

  const conUbicacion = clientes
    .filter((c) => c.latitud != null && c.longitud != null)
    .map((c) => ({
      id: c.id,
      nombre: c.nombreNegocio,
      direccion: c.direccion,
      comuna: c.comuna,
      lat: c.latitud as number,
      lng: c.longitud as number,
      saldo: c.ventas.reduce(
        (s, v) => s + (Number(v.total) - v.pagos.reduce((a, p) => a + Number(p.monto), 0)),
        0,
      ),
    }));

  const sinUbicacion = clientes.filter((c) => c.latitud == null || c.longitud == null).length;

  return (
    <div>
      <h1 className="text-xl font-extrabold text-slate-900">Ruta sugerida</h1>
      <p className="text-sm text-slate-500">Del cliente más cercano al más lejano, según dónde estés.</p>

      <div className="mt-3">
        <RutaSugerida clientes={conUbicacion} />
      </div>

      {sinUbicacion > 0 && (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-3 text-center text-xs text-slate-500">
          {sinUbicacion} cliente(s) sin ubicación no entran en la ruta.{" "}
          <Link href="/vendedor" className="font-semibold text-[#1479c4]">Agrégala en su ficha.</Link>
        </p>
      )}
    </div>
  );
}
