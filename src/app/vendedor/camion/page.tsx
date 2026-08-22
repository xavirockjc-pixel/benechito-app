import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { asignarVehiculo, cargarVehiculo, devolverTodoABodega, cargarSabor } from "../actions";
import CargarCamionVoz from "./CargarCamionVoz";

export const dynamic = "force-dynamic";

const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#1479c4]";

export default async function CamionPage() {
  const u = await usuarioActual();
  const usuario = u ? await prisma.usuario.findUnique({ where: { id: u.sub }, select: { vehiculoId: true } }) : null;

  const [vehiculos, bodega] = await Promise.all([
    prisma.ubicacion.findMany({ where: { tipo: "vehiculo", activo: true }, orderBy: { nombre: "asc" } }),
    prisma.ubicacion.findFirst({ where: { tipo: "bodega" } }),
  ]);

  const vehId = usuario?.vehiculoId ?? null;
  const vehiculo = vehId ? vehiculos.find((v) => v.id === vehId) ?? (await prisma.ubicacion.findUnique({ where: { id: vehId } })) : null;

  // Sin vehículo asignado → elegir uno
  if (!vehiculo) {
    return (
      <div>
        <h1 className="text-xl font-extrabold text-slate-900">Mi camión</h1>
        <p className="mt-1 text-sm text-slate-500">Elige con qué vehículo vas a trabajar hoy.</p>
        {vehiculos.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No hay vehículos. Créalos en el panel (Inventario → Ubicaciones).
          </p>
        ) : (
          <form action={asignarVehiculo} className="mt-4 space-y-3">
            <select name="vehiculoId" required defaultValue="" className={inputCls}>
              <option value="">Selecciona tu vehículo…</option>
              {vehiculos.map((v) => <option key={v.id} value={v.id}>{v.nombre}</option>)}
            </select>
            <button className="w-full rounded-xl bg-[#1479c4] py-3 text-base font-extrabold text-white">Usar este vehículo</button>
          </form>
        )}
      </div>
    );
  }

  // Con vehículo → stock actual + cargar + devolver
  const [productos, stockCamion, stockBodega, sabores, saborCamion] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.stock.findMany({ where: { ubicacionId: vehiculo.id }, include: { producto: { select: { nombre: true } } } }),
    bodega ? prisma.stock.findMany({ where: { ubicacionId: bodega.id } }) : Promise.resolve([]),
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }] }),
    prisma.stockSabor.findMany({ where: { ubicacionId: vehiculo.id }, include: { sabor: { select: { nombre: true } } } }),
  ]);

  const enCamion = stockCamion.filter((s) => s.cantidad !== 0).sort((a, b) => a.producto.nombre.localeCompare(b.producto.nombre));
  const totalCamion = enCamion.reduce((s, x) => s + x.cantidad, 0);
  const bodegaDe = new Map(stockBodega.map((s) => [s.productoId, s.cantidad]));

  const cajaSabores = saborCamion.filter((s) => s.cantidad !== 0).sort((a, b) => a.sabor.nombre.localeCompare(b.sabor.nombre));
  const totalCaja = cajaSabores.reduce((s, x) => s + x.cantidad, 0);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-slate-900">🚚 {vehiculo.nombre}</h1>
        <form action={asignarVehiculo}>
          <input type="hidden" name="vehiculoId" value="" />
          <button className="text-xs font-semibold text-slate-400 underline">cambiar</button>
        </form>
      </div>

      {!bodega && (
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
          No hay bodega configurada; la carga y devolución necesitan una bodega (Inventario → Ubicaciones).
        </p>
      )}

      {/* Stock actual del camión */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">Lo que llevas ({totalCamion} u.)</h2>
        {enCamion.length === 0 ? (
          <p className="text-sm text-slate-500">El camión está vacío. Carga productos abajo.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {enCamion.map((s) => (
              <li key={s.id} className="flex justify-between py-1.5">
                <span className="text-slate-800">{s.producto.nombre}</span>
                <span className="font-bold text-slate-900">{s.cantidad}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Cargar desde bodega */}
      <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">Cargar desde bodega</h2>

        {bodega && (
          <div className="mb-3">
            <CargarCamionVoz productos={productos.map((p) => ({ id: p.id, nombre: p.nombre, enBodega: bodegaDe.get(p.id) ?? 0 }))} />
            <p className="my-2 text-center text-xs text-slate-400">— o carga uno a uno —</p>
          </div>
        )}

        <form action={cargarVehiculo} className="grid grid-cols-[1fr_auto_auto] items-end gap-2">
          <label className="text-xs font-bold text-slate-600">Producto
            <select name="productoId" required defaultValue="" className={`mt-1 ${inputCls}`}>
              <option value="">Selecciona…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre} (bodega: {bodegaDe.get(p.id) ?? 0})</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">Cant.
            <input type="number" name="cantidad" min="1" step="1" defaultValue="1" inputMode="numeric" className="mt-1 w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <button className="rounded-lg bg-[#1479c4] px-4 py-2 text-sm font-bold text-white">Cargar</button>
        </form>
      </section>

      {/* Devolver lo que sobró */}
      {totalCamion > 0 && (
        <form action={devolverTodoABodega} className="mt-4">
          <button className="w-full rounded-xl border-2 border-slate-200 bg-white py-3 text-sm font-bold text-slate-700 active:bg-slate-50">
            ↩️ Devolver todo a bodega ({totalCamion} u.)
          </button>
          <p className="mt-1 text-center text-xs text-slate-400">Al terminar la ruta, lo que no vendiste vuelve solo a bodega.</p>
        </form>
      )}

      {/* Caja de reposición (por sabor) — para reponer los Puntos */}
      <section className="mt-6 rounded-xl border border-[#1479c4]/30 bg-blue-50/40 p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">🍫 Caja de reposición ({totalCaja} u.)</h2>
        <p className="mb-2 text-xs text-slate-500">Sabores que llevas para reponer los Puntos.</p>
        {cajaSabores.length === 0 ? (
          <p className="text-sm text-slate-500">Caja vacía. Carga sabores abajo.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 text-sm">
            {cajaSabores.map((s) => (
              <li key={s.id} className="flex justify-between py-1">
                <span className="text-slate-800">{s.sabor.nombre}</span>
                <span className="font-bold text-slate-900">{s.cantidad}</span>
              </li>
            ))}
          </ul>
        )}
        {sabores.length > 0 && (
          <form action={cargarSabor} className="mt-3 grid grid-cols-[1fr_auto_auto] items-end gap-2">
            <label className="text-xs font-bold text-slate-600">Sabor
              <select name="saborId" required defaultValue="" className={`mt-1 ${inputCls}`}>
                <option value="">Selecciona…</option>
                {sabores.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-slate-600">Cant.
              <input type="number" name="cantidad" min="1" step="1" defaultValue="1" inputMode="numeric" className="mt-1 w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
            <button className="rounded-lg bg-[#1479c4] px-4 py-2 text-sm font-bold text-white">Cargar</button>
          </form>
        )}
      </section>

      <Link
        href="/vendedor/cierre"
        className="mt-4 block rounded-xl bg-slate-900 py-3 text-center text-sm font-extrabold text-white active:brightness-95"
      >
        🧾 Cierre de ruta del día
      </Link>

      <div className="mt-5 text-center">
        <Link href="/vendedor" className="text-sm font-semibold text-[#1479c4]">← Volver a clientes</Link>
      </div>
    </div>
  );
}
