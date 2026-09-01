import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CATEGORIAS_CAP, categoriaCapLabel, ROLES_FORM, rolFormLabel, urlEmbed } from "@/lib/dominio/checklists";
import { crearCapacitacion, toggleCapacitacion, borrarCapacitacion } from "./actions";
import MicDictado from "@/components/MicDictado";

export const dynamic = "force-dynamic";
const inputCls = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800";

export default async function CapacitacionesPage() {
  const [caps, productos] = await Promise.all([
    prisma.capacitacion.findMany({ orderBy: [{ categoria: "asc" }, { orden: "asc" }], include: { _count: { select: { vistas: true } } } }),
    prisma.producto.findMany({ where: { activo: true }, select: { id: true, nombre: true }, orderBy: { nombre: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-slate-900">🎓 Capacitaciones</h1>
      <p className="text-sm text-slate-500">Videos paso a paso de fabricación y uso de máquinas. Suben a YouTube (oculto) o Drive y pega el enlace.</p>
      <div className="mt-2"><MicDictado etiqueta="🎤 Dictar" /></div>

      {/* Crear */}
      <form action={crearCapacitacion} className="mt-5 max-w-2xl space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="font-display text-base font-extrabold text-slate-900">Nueva capacitación</p>
        <label className="block text-sm font-bold text-slate-700">Título
          <input name="titulo" required placeholder="Ej: Uso de la máquina de paletas" className={inputCls} />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block text-sm font-bold text-slate-700">Categoría
            <select name="categoria" defaultValue="fabricacion" className={inputCls}>
              {CATEGORIAS_CAP.map((c) => <option key={c} value={c}>{categoriaCapLabel[c]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">Aplica a
            <select name="rol" defaultValue="todos" className={inputCls}>
              {ROLES_FORM.map((r) => <option key={r} value={r}>{rolFormLabel[r]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-bold text-slate-700">Producto/receta (opcional)
            <select name="productoId" defaultValue="" className={inputCls}>
              <option value="">— Ninguno —</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm font-bold text-slate-700">Enlace del video (YouTube o Drive)
          <input name="urlVideo" placeholder="https://youtu.be/…" className={inputCls} />
        </label>
        <label className="block text-sm font-bold text-slate-700">Descripción (opcional)
          <input name="descripcion" className={inputCls} />
        </label>
        <label className="block text-sm font-bold text-slate-700">Pasos escritos (opcional)
          <textarea name="pasos" rows={3} placeholder="1) …&#10;2) …" className={inputCls} />
        </label>
        <button className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-extrabold text-white">Guardar capacitación</button>
      </form>

      {/* Lista */}
      <h2 className="mb-2 mt-8 font-display text-lg font-extrabold text-slate-900">Capacitaciones ({caps.length})</h2>
      {caps.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Aún no hay capacitaciones. Crea la primera arriba.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {caps.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-display text-base font-extrabold text-slate-900">{c.titulo}</p>
              <p className="mt-0.5 text-xs text-slate-500">{categoriaCapLabel[c.categoria] ?? c.categoria} · {rolFormLabel[c.rol] ?? c.rol} · 👁️ {c._count.vistas} vistas {c.urlVideo ? (urlEmbed(c.urlVideo) ? "· 🎬 video" : "· 🔗 enlace") : "· sin video"}</p>
              <div className="mt-3 flex items-center gap-2">
                <Link href={`/admin/capacitaciones/${c.id}/editar`} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700">✏️ Editar</Link>
                <form action={toggleCapacitacion}><input type="hidden" name="id" value={c.id} /><button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">{c.activo ? "Desactivar" : "Activar"}</button></form>
                <form action={borrarCapacitacion} className="ml-auto"><input type="hidden" name="id" value={c.id} /><button className="rounded-lg px-2 py-1.5 text-xs font-bold text-red-500">Eliminar</button></form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
