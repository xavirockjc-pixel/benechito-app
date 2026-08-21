import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { devolverTodoABodega } from "../actions";
import CuadreCaja from "./CuadreCaja";

export const dynamic = "force-dynamic";

export default async function CierrePage() {
  const u = await usuarioActual();
  const usuario = u ? await prisma.usuario.findUnique({ where: { id: u.sub }, select: { vehiculoId: true } }) : null;
  const vehId = usuario?.vehiculoId ?? null;

  if (!vehId) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Cierre de ruta</h1>
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Primero elige tu vehículo en <Link href="/vendedor/camion" className="font-semibold text-[#1479c4]">Camión</Link>.
        </p>
      </div>
    );
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [ventasHoy, pagosHoy, stockCamion] = await Promise.all([
    prisma.venta.findMany({
      where: { ubicacionId: vehId, fecha: { gte: hoy } },
      include: { pagos: { select: { monto: true } } },
    }),
    prisma.pago.findMany({ where: { fecha: { gte: hoy }, venta: { ubicacionId: vehId } } }),
    prisma.stock.findMany({ where: { ubicacionId: vehId, cantidad: { gt: 0 } }, include: { producto: { select: { nombre: true } } } }),
  ]);

  // Dinero
  const vendido = ventasHoy.reduce((s, v) => s + Number(v.total), 0);
  const efectivo = pagosHoy.filter((p) => p.medio === "efectivo").reduce((s, p) => s + Number(p.monto), 0);
  const transferencia = pagosHoy.filter((p) => p.medio === "transferencia").reduce((s, p) => s + Number(p.monto), 0);
  const otros = pagosHoy
    .filter((p) => !["efectivo", "transferencia"].includes(p.medio))
    .reduce((s, p) => s + Number(p.monto), 0);
  const credito = ventasHoy.reduce(
    (s, v) => s + Math.max(0, Number(v.total) - v.pagos.reduce((a, p) => a + Number(p.monto), 0)),
    0,
  );

  // Comercial
  const clientes = new Set(ventasHoy.map((v) => v.negocioId)).size;

  // Mercadería que queda
  const quedan = stockCamion.reduce((s, x) => s + x.cantidad, 0);

  return (
    <div>
      <h1 className="text-xl font-extrabold text-slate-900">Cierre de ruta</h1>
      <p className="text-sm text-slate-500">Resumen de hoy para cuadrar dinero y mercadería.</p>

      {/* Resumen del día */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Stat label="Vendido hoy" valor={fmtCLP(vendido)} />
        <Stat label="Ventas" valor={String(ventasHoy.length)} />
        <Stat label="Clientes" valor={String(clientes)} />
        <Stat label="Por cobrar (crédito)" valor={fmtCLP(credito)} rojo={credito > 0} />
      </div>

      {/* Dinero */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">Dinero</h2>
        <div className="space-y-1 text-sm">
          <Row label="Transferencias" valor={fmtCLP(transferencia)} />
          {otros > 0 && <Row label="Otros medios" valor={fmtCLP(otros)} />}
          <Row label="A crédito (fiado)" valor={fmtCLP(credito)} />
        </div>
        <div className="mt-3 border-t border-slate-200 pt-3">
          <CuadreCaja esperado={efectivo} />
        </div>
      </section>

      {/* Mercadería */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">Mercadería en el camión ({quedan} u.)</h2>
        {stockCamion.length === 0 ? (
          <p className="text-sm text-slate-500">Camión vacío. Nada que devolver.</p>
        ) : (
          <>
            <ul className="divide-y divide-slate-100 text-sm">
              {stockCamion.map((s) => (
                <li key={s.id} className="flex justify-between py-1.5">
                  <span className="text-slate-800">{s.producto.nombre}</span>
                  <span className="font-bold text-slate-900">{s.cantidad}</span>
                </li>
              ))}
            </ul>
            <form action={devolverTodoABodega} className="mt-3">
              <button className="w-full rounded-xl bg-[#1479c4] py-3 text-sm font-extrabold text-white active:brightness-95">
                ↩️ Devolver todo a bodega y cerrar
              </button>
            </form>
          </>
        )}
      </section>

      <div className="mt-5 text-center">
        <Link href="/vendedor" className="text-sm font-semibold text-[#1479c4]">← Volver a clientes</Link>
      </div>
    </div>
  );
}

function Stat({ label, valor, rojo }: { label: string; valor: string; rojo?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className={`text-lg font-extrabold ${rojo ? "text-red-600" : "text-slate-900"}`}>{valor}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function Row({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-600">{label}</span>
      <span className="font-semibold text-slate-900">{valor}</span>
    </div>
  );
}
