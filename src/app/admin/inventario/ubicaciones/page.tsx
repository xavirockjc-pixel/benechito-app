import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { tipoUbicacionLabel } from "@/lib/dominio/inventario";
import { crearUbicacion, actualizarUbicacion, eliminarUbicacion } from "../actions";

export const dynamic = "force-dynamic";

const TIPOS = ["bodega", "sala", "vehiculo", "otro"];
const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-800 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200";

export default async function UbicacionesPage() {
  const ubicaciones = await prisma.ubicacion.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    include: { sucursal: { select: { nombre: true } } },
  });

  return (
    <div>
      <Link href="/admin/inventario" className="text-sm font-semibold text-naranja">
        ← Inventario
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Ubicaciones</h1>
      <p className="text-sm text-slate-500">Bodegas, sala de ventas y vehículos donde hay stock.</p>

      {/* Crear */}
      <section className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-900">Nueva ubicación</h2>
        <form action={crearUbicacion} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-sm font-bold text-slate-700">Nombre
            <input name="nombre" required placeholder="Vehículo 2" className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-sm font-bold text-slate-700">Tipo
            <select name="tipo" required defaultValue="vehiculo" className={`mt-1 ${inputCls}`}>
              {TIPOS.map((t) => <option key={t} value={t}>{tipoUbicacionLabel[t]}</option>)}
            </select>
          </label>
          <button className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-700">
            Agregar
          </button>
        </form>
      </section>

      {/* Lista editable */}
      <div className="mt-5 space-y-3">
        {ubicaciones.map((u) => (
          <div key={u.id} className={`rounded-xl border p-4 shadow-sm ${u.activo ? "border-slate-200 bg-white" : "border-slate-200 bg-slate-50"}`}>
            <form action={actualizarUbicacion} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
              <input type="hidden" name="id" value={u.id} />
              <label className="text-sm font-bold text-slate-700">Nombre
                <input name="nombre" defaultValue={u.nombre} className={`mt-1 ${inputCls}`} />
              </label>
              <label className="text-sm font-bold text-slate-700">Tipo
                <select name="tipo" defaultValue={u.tipo} className={`mt-1 ${inputCls}`}>
                  {TIPOS.map((t) => <option key={t} value={t}>{tipoUbicacionLabel[t]}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 pb-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" name="activo" value="si" defaultChecked={u.activo} className="h-5 w-5 accent-naranja" /> Activa
              </label>
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700">
                Guardar
              </button>
            </form>
            <form action={eliminarUbicacion} className="mt-2">
              <input type="hidden" name="id" value={u.id} />
              <button className="text-xs font-semibold text-rojo/70 hover:text-rojo">Eliminar</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
