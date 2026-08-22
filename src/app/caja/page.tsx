import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { abrirCaja, sesionAbierta } from "./actions";
import CajaPOS from "./CajaPOS";

export const dynamic = "force-dynamic";

export default async function CajaPage() {
  const sesion = await sesionAbierta();

  // Sin caja abierta → pedir fondo.
  if (!sesion) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className="text-xl font-extrabold text-slate-900">Abrir caja</h1>
        <p className="mt-1 text-sm text-slate-500">¿Con cuánto efectivo de cambio partes hoy?</p>
        <form action={abrirCaja} className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-sm font-bold text-slate-700">Fondo inicial (efectivo)
            <input type="number" name="fondo" min="0" step="1" defaultValue="0" required inputMode="numeric"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-lg font-semibold text-slate-800 outline-none focus:border-[#0f7a44]" />
          </label>
          <button className="mt-4 w-full rounded-xl bg-[#0f7a44] py-3 text-base font-extrabold text-white shadow-sm active:brightness-110">
            Abrir caja
          </button>
        </form>
      </div>
    );
  }

  // Caja abierta → resumen + POS.
  const [lista, ventas] = await Promise.all([
    prisma.listaPrecio.findFirst({ where: { canal: "sala" } }),
    prisma.venta.findMany({ where: { sesionCajaId: sesion.id }, include: { pagos: true } }),
  ]);

  const precios = lista
    ? await prisma.precioProducto.findMany({
        where: { listaId: lista.id, cantidadMinima: 1 },
        include: { producto: { select: { id: true, nombre: true, formato: true, activo: true } } },
      })
    : [];
  const productos = precios
    .filter((p) => p.producto.activo)
    .map((p) => ({ id: p.producto.id, nombre: p.producto.nombre, formato: p.producto.formato, precio: Number(p.precio) }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const totalVendido = ventas.reduce((s, v) => s + Number(v.total), 0);
  const nVentas = ventas.length;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          <Stat label="Vendido" valor={fmtCLP(totalVendido)} />
          <Stat label="Ventas" valor={String(nVentas)} />
          <Stat label="Fondo" valor={fmtCLP(Number(sesion.fondoInicial))} />
        </div>
        <Link href="/caja/cierre" className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white active:brightness-110">
          🧾 Cerrar caja
        </Link>
      </div>

      <CajaPOS productos={productos} />
    </div>
  );
}

function Stat({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-1.5">
      <p className="text-sm font-extrabold text-slate-900">{valor}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
