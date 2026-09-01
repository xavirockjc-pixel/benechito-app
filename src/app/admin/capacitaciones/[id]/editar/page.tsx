import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CATEGORIAS_CAP, categoriaCapLabel, ROLES_FORM, rolFormLabel } from "@/lib/dominio/checklists";
import { actualizarCapacitacion } from "../../actions";

export const dynamic = "force-dynamic";
const inputCls = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800";

export default async function EditarCapacitacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [c, productos] = await Promise.all([
    prisma.capacitacion.findUnique({ where: { id } }),
    prisma.producto.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);
  if (!c) notFound();

  return (
    <div>
      <Link href="/admin/capacitaciones" className="text-sm font-semibold text-[#1479c4]">← Capacitaciones</Link>
      <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900">Editar capacitación</h1>
      <form action={actualizarCapacitacion} className="mt-4 max-w-2xl space-y-3">
        <input type="hidden" name="id" value={c.id} />
        <label className="block text-sm font-bold text-slate-700">Título
          <input name="titulo" defaultValue={c.titulo} required className={inputCls} />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block text-sm font-bold text-slate-700">Categoría
            <select name="categoria" defaultValue={c.categoria} className={inputCls}>
              {CATEGORIAS_CAP.map((x) => <option key={x} value={x}>{categoriaCapLabel[x]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">Aplica a
            <select name="rol" defaultValue={c.rol} className={inputCls}>
              {ROLES_FORM.map((r) => <option key={r} value={r}>{rolFormLabel[r]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">Producto/receta
            <select name="productoId" defaultValue={c.productoId ?? ""} className={inputCls}>
              <option value="">— Ninguno —</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm font-bold text-slate-700">Enlace del video
          <input name="urlVideo" defaultValue={c.urlVideo ?? ""} className={inputCls} />
        </label>
        <label className="block text-sm font-bold text-slate-700">Descripción
          <input name="descripcion" defaultValue={c.descripcion ?? ""} className={inputCls} />
        </label>
        <label className="block text-sm font-bold text-slate-700">Pasos escritos
          <textarea name="pasos" rows={4} defaultValue={c.pasos ?? ""} className={inputCls} />
        </label>
        <button className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-extrabold text-white">Guardar cambios</button>
      </form>
    </div>
  );
}
