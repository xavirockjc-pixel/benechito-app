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

  const [ventasHoy, pagosHoy, stockCamion, movsHoy] = await Promise.all([
    prisma.venta.findMany({
      where: { ubicacionId: vehId, fecha: { gte: hoy } },
      include: { pagos: { select: { monto: true } } },
    }),
    prisma.pago.findMany({ where: { fecha: { gte: hoy }, venta: { ubicacionId: vehId } } }),
    prisma.stock.findMany({ where: { ubicacionId: vehId, cantidad: { gt: 0 } }, include: { producto: { select: { nombre: true } } } }),
    prisma.movimientoStock.findMany({
      where: { fecha: { gte: hoy }, OR: [{ ubicacionOrigenId: vehId }, { ubicacionDestinoId: vehId }] },
      include: { producto: { select: { nombre: true } } },
    }),
  ]);

  // ---- Cuadre de mercadería: lo que se llevó (cargó) vs vendió vs volvió vs queda ----
  type FilaCuadre = { nombre: string; cargo: number; vendio: number; volvio: number; queda: number };
  const cuadre = new Map<string, FilaCuadre>();
  const filaDe = (id: string, nombre: string) => {
    let f = cuadre.get(id);
    if (!f) { f = { nombre, cargo: 0, vendio: 0, volvio: 0, queda: 0 }; cuadre.set(id, f); }
    return f;
  };
  for (const m of movsHoy) {
    const f = filaDe(m.productoId, m.producto.nombre);
    if (m.tipo === "transferencia" && m.ubicacionDestinoId === vehId) f.cargo += m.cantidad;      // cargó al camión
    else if (m.tipo === "venta" && m.ubicacionOrigenId === vehId) f.vendio += m.cantidad;          // vendió desde el camión
    else if (m.tipo === "transferencia" && m.ubicacionOrigenId === vehId) f.volvio += m.cantidad;  // devolvió a bodega
  }
  for (const s of stockCamion) filaDe(s.productoId, s.producto.nombre).queda += s.cantidad;         // aún en el camión
  const filasCuadre = [...cuadre.values()]
    .map((f) => ({ ...f, falta: f.cargo - f.vendio - f.volvio - f.queda }))
    .filter((f) => f.cargo || f.vendio || f.volvio || f.queda)
    .sort((a, b) => b.falta - a.falta || a.nombre.localeCompare(b.nombre));
  const totCargo = filasCuadre.reduce((s, f) => s + f.cargo, 0);
  const totVendio = filasCuadre.reduce((s, f) => s + f.vendio, 0);
  const totVolvio = filasCuadre.reduce((s, f) => s + f.volvio, 0);
  const totQueda = filasCuadre.reduce((s, f) => s + f.queda, 0);
  const totFalta = totCargo - totVendio - totVolvio - totQueda;

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

      {/* Cuadre de mercadería: cargó vs vendió vs volvió */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">📦 Cuadre de mercadería</h2>
        <p className="mb-3 text-xs text-slate-500">Cargó − Vendió − Volvió − Queda = lo que falta.</p>

        {filasCuadre.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no cargaste mercadería hoy.</p>
        ) : (
          <>
            {/* Totales */}
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <TotCol label="Cargó" valor={totCargo} color="#1479c4" />
              <TotCol label="Vendió" valor={totVendio} color="#16a34a" />
              <TotCol label="Volvió" valor={totVolvio} color="#64748b" />
              <TotCol label="Queda" valor={totQueda} color="#64748b" />
            </div>
            <div className={`mt-2 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-extrabold ${totFalta === 0 ? "bg-green-50 text-green-700" : totFalta > 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
              <span>{totFalta === 0 ? "✅ Cuadra perfecto" : totFalta > 0 ? "⚠️ Falta mercadería" : "❔ Sobra (revisar)"}</span>
              <span>{totFalta === 0 ? "0" : `${Math.abs(totFalta)} u.`}</span>
            </div>

            {/* Detalle por producto */}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="py-1 text-left font-bold">Producto</th>
                    <th className="py-1 text-right font-bold">Cargó</th>
                    <th className="py-1 text-right font-bold">Vendió</th>
                    <th className="py-1 text-right font-bold">Volvió</th>
                    <th className="py-1 text-right font-bold">Falta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filasCuadre.map((f) => (
                    <tr key={f.nombre}>
                      <td className="py-1.5 pr-2 font-semibold text-slate-800">{f.nombre}</td>
                      <td className="py-1.5 text-right text-slate-700">{f.cargo}</td>
                      <td className="py-1.5 text-right font-semibold text-green-700">{f.vendio}</td>
                      <td className="py-1.5 text-right text-slate-500">{f.volvio + f.queda}</td>
                      <td className={`py-1.5 text-right font-extrabold ${f.falta === 0 ? "text-slate-400" : f.falta > 0 ? "text-red-600" : "text-amber-600"}`}>
                        {f.falta === 0 ? "—" : f.falta > 0 ? f.falta : `+${-f.falta}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] leading-tight text-slate-400">“Volvió” junta lo ya devuelto a bodega y lo que aún queda en el camión.</p>
          </>
        )}
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

function TotCol({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2">
      <p className="text-xl font-extrabold" style={{ color }}>{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
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
