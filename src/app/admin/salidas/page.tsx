import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { registrarSalida, borrarSalida } from "./actions";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Salidas / ventas con MOTIVO: registra qué salió y por qué (cliente, al local, merma)
 * descontando del stock. Ej: "-20 Tú y Yo · Sra Checa", "-10 Pack postre · Don Alex".
 */
export default async function SalidasPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const bodega = await prisma.ubicacion.findFirst({ where: { tipo: "bodega", activo: true } });
  const [productos, ubicaciones, salidas] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.ubicacion.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true, tipo: true } }),
    prisma.movimientoStock.findMany({
      where: { tipo: "venta" },
      orderBy: { fecha: "desc" }, take: 50,
      include: { producto: { select: { nombre: true } }, ubicacionOrigen: { select: { nombre: true } } },
    }),
  ]);

  const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-[#1479c4]";

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/admin/inventario" className="text-sm font-semibold text-[#1479c4]">← Inventario</Link>
      <h1 className="mt-1 text-2xl font-extrabold text-slate-900">➖ Salidas / ventas</h1>
      <p className="text-sm text-slate-500">Registra lo que sale con su motivo (cliente, al local, merma). Descuenta del stock.</p>

      {ok && <p className="mt-3 rounded-xl bg-green-100 px-4 py-2.5 text-center text-sm font-bold text-green-700">✓ Salida registrada</p>}

      {/* Registrar salida */}
      <form action={registrarSalida} className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="block text-xs font-bold text-slate-600">Producto
          <select name="productoId" required defaultValue="" className={`mt-1 ${inputCls}`}>
            <option value="">Elige…</option>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-slate-600">Cantidad que sale
            <input name="cantidad" inputMode="numeric" required placeholder="Ej: 20" className={`mt-1 ${inputCls}`} />
          </label>
          <label className="text-xs font-bold text-slate-600">Desde
            <select name="ubicacionId" defaultValue={bodega?.id ?? ""} className={`mt-1 ${inputCls}`}>
              {ubicaciones.map((u) => <option key={u.id} value={u.id}>{u.tipo === "bodega" ? "🏭 " : u.tipo === "sala" ? "🏪 " : u.tipo === "vehiculo" ? "🚚 " : ""}{u.nombre}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-xs font-bold text-slate-600">Motivo / a quién
          <input name="motivo" list="motivos" placeholder="Ej: Sra Checa · Don Alex · al local · merma" className={`mt-1 ${inputCls}`} />
          <datalist id="motivos"><option value="al local" /><option value="merma" /><option value="regalo / degustación" /><option value="traslado a bodega" /></datalist>
        </label>
        <button className="w-full rounded-xl bg-[#e23b2c] py-3 text-sm font-extrabold text-white active:brightness-95">➖ Registrar salida</button>
      </form>

      {/* Historial de salidas */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-500">Últimas salidas</h2>
      {salidas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">Sin salidas registradas.</p>
      ) : (
        <ul className="space-y-1.5">
          {salidas.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
              <span className="min-w-0">
                <span className="font-bold text-red-600">−{m.cantidad}</span> <span className="font-semibold text-slate-800">{m.producto.nombre}</span>
                <span className="block text-[11px] text-slate-400">{m.motivo ? `${m.motivo} · ` : ""}{m.ubicacionOrigen?.nombre ?? ""} · {fmtFecha(m.fecha)}</span>
              </span>
              <form action={borrarSalida}><input type="hidden" name="id" value={m.id} /><button className="shrink-0 text-xs font-bold text-slate-400 hover:text-rose-600">deshacer</button></form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
