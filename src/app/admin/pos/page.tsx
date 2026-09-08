import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CANALES_VENTA } from "@/lib/dominio/venta-voz";
import VentaVoz from "./VentaVoz";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  // Listas por canal (local=sala, ruta=reparto, distribuidor).
  const canales = Object.values(CANALES_VENTA).map((c) => c.lista);
  const [listas, prods, precios, clientesRaw] = await Promise.all([
    prisma.listaPrecio.findMany({ where: { canal: { in: canales }, activo: true }, select: { id: true, canal: true } }),
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.precioProducto.findMany({ where: { cantidadMinima: 1 }, select: { productoId: true, listaId: true, precio: true } }),
    prisma.negocio.findMany({ where: { nombreNegocio: { not: "Consumidor Final" } }, orderBy: { nombreNegocio: "asc" }, select: { id: true, nombreNegocio: true, comuna: true } }),
  ]);

  // listaId → canalKey
  const listaCanal: Record<string, "local" | "ruta" | "distribuidor"> = {};
  for (const [k, c] of Object.entries(CANALES_VENTA)) {
    const l = listas.find((x) => x.canal === c.lista);
    if (l) listaCanal[l.id] = k as "local" | "ruta" | "distribuidor";
  }

  // productoId → { local, ruta, distribuidor }
  const preciosDe: Record<string, { local: number; ruta: number; distribuidor: number }> = {};
  for (const p of precios) {
    const canalKey = listaCanal[p.listaId];
    if (!canalKey) continue;
    (preciosDe[p.productoId] ??= { local: 0, ruta: 0, distribuidor: 0 })[canalKey] = Number(p.precio);
  }

  const productos = prods.map((p) => ({ id: p.id, nombre: p.nombre, precios: preciosDe[p.id] ?? { local: 0, ruta: 0, distribuidor: 0 } }));
  const clientes = clientesRaw.map((c) => ({ id: c.id, nombre: c.nombreNegocio, comuna: c.comuna ?? "" }));

  return (
    <div className="mx-auto max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">🎤 Vender por voz</h1>
          <p className="text-sm text-slate-500">Di lo que vendiste y a quién. Descuenta stock y registra la venta al instante.</p>
        </div>
        <Link href="/admin/precios" className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500">Precios</Link>
      </div>

      <div className="mt-5"><VentaVoz productos={productos} clientes={clientes} /></div>
    </div>
  );
}
