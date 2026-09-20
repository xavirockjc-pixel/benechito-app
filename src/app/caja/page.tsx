import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { abrirCaja, sesionAbierta } from "./actions";
import { ESCALONES_LOCAL } from "@/lib/dominio/precios";
import CajaPOS from "./CajaPOS";
import AbrirCajaEfectivo from "./AbrirCajaEfectivo";
import MovCajaLocalForm from "./MovCajaLocalForm";
import RetirosDepto from "@/app/_shared/RetirosDepto";

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
          <AbrirCajaEfectivo />
          <button className="mt-4 w-full rounded-xl bg-[#0f7a44] py-3 text-base font-extrabold text-white shadow-sm active:brightness-110">
            Abrir caja
          </button>
        </form>
        <Link href="/caja/distribucion" className="mt-3 block rounded-xl border border-slate-300 bg-white py-2.5 text-center text-sm font-bold text-slate-700 active:bg-slate-50">
          📦 Recibir distribución
        </Link>
      </div>
    );
  }

  // Caja abierta → resumen + POS.
  const salaUbic = (await prisma.ubicacion.findFirst({ where: { tipo: "sala" } })) ?? (await prisma.ubicacion.findFirst());

  const [prods, precios, stockSala, ventas] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    prisma.precioProducto.findMany({ include: { lista: { select: { canal: true } } } }),
    salaUbic ? prisma.stock.findMany({ where: { ubicacionId: salaUbic.id } }) : Promise.resolve([]),
    prisma.venta.findMany({ where: { sesionCajaId: sesion.id }, include: { pagos: true } }),
  ]);

  // Precio neto por producto → canal → { base (cantMin 1) y tramos por volumen }.
  type Escalon = { desde: number; precio: number };
  const porCanal: Record<string, Record<string, { base?: number; tramos: Escalon[] }>> = {};
  for (const p of precios) {
    const canal = p.lista.canal;
    const m = (porCanal[p.productoId] ??= {});
    const e = (m[canal] ??= { tramos: [] });
    const neto = Number(p.precio) - Number(p.descuento ?? 0);
    if (p.cantidadMinima <= 1) e.base = neto;
    else e.tramos.push({ desde: p.cantidadMinima, precio: neto });
  }

  // Escalera del LOCAL por cantidad: unitario/minorista/mayorista + tramos por volumen (lista Sala).
  const escaleraLocal = (pid: string): { desde: number; precio: number; label: string }[] => {
    const canales = porCanal[pid] ?? {};
    const escalones: { desde: number; precio: number; label: string }[] = [];
    for (const esc of ESCALONES_LOCAL) {
      const base = canales[esc.perfil]?.base;
      if (base != null) escalones.push({ desde: esc.desde, precio: base, label: esc.label });
    }
    for (const t of canales.sala?.tramos ?? []) escalones.push({ desde: t.desde, precio: t.precio, label: `Por ${t.desde}` });
    return escalones.sort((a, b) => a.desde - b.desde || b.precio - a.precio);
  };

  const stockDe = new Map(stockSala.map((s) => [s.productoId, s.cantidad]));

  const productos = prods.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    formato: p.formato,
    escalera: escaleraLocal(p.id),
    stock: stockDe.get(p.id) ?? 0,
  }));

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
        <div className="flex gap-2">
          <Link href="/caja/distribucion" className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 active:bg-slate-50">
            📦 Distribución
          </Link>
          <Link href="/caja/cierre" className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white active:brightness-110">
            🧾 Cerrar caja
          </Link>
        </div>
      </div>

      <CajaPOS productos={productos} />

      <div className="mt-4"><MovCajaLocalForm /></div>

      <RetirosDepto destino="local" acento="#0f7a44" />
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
