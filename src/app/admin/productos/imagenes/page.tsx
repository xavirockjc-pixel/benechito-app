import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { lineaLabel } from "@/lib/dominio/produccion";
import { seccionCatalogoLabel, seccionCatalogoIcono } from "@/lib/dominio/catalogo";
import SubirFoto from "../SubirFoto";
import { togglePublicarTienda, guardarReglasTienda } from "../actions";

export const dynamic = "force-dynamic";

export default async function ImagenesPage() {
  const productos = await prisma.producto.findMany({
    where: { activo: true },
    orderBy: [{ seccion: "asc" }, { nombre: "asc" }],
  });
  const conFoto = productos.filter((p) => p.fotoUrl).length;
  const enTienda = productos.filter((p) => p.publicarTienda).length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/admin/productos" className="text-sm font-semibold text-slate-500 hover:text-slate-800">← Catálogo</Link>
          <h1 className="text-2xl font-extrabold text-slate-900">📷 Fotos de la tienda</h1>
          <p className="text-sm text-slate-500">Sube la foto de cada producto (desde tu compu o celular) y elige cuáles se publican en la tienda.</p>
        </div>
        <a href="/tienda" target="_blank" rel="noopener noreferrer" className="rounded-full bg-[#1479c4] px-5 py-2.5 text-sm font-bold text-white active:scale-95">🛒 Ver tienda</a>
      </div>

      <div className="mt-4 flex gap-2 text-sm">
        <span className="rounded-lg bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">{conFoto}/{productos.length} con foto</span>
        <span className="rounded-lg bg-[#1479c4]/10 px-3 py-1.5 font-semibold text-[#1479c4]">{enTienda} en la tienda</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {productos.map((p) => (
          <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <SubirFoto id={p.id} fotoUrl={p.fotoUrl} nombre={p.nombre} />
            <p className="mt-2 truncate text-sm font-bold text-slate-900">{p.nombre}</p>
            <p className="truncate text-[11px] text-slate-400">
              {seccionCatalogoIcono[p.seccion ?? "propio"]} {seccionCatalogoLabel[p.seccion ?? "propio"] ?? p.seccion}
              {p.formato ? ` · ${p.formato}` : ""}
            </p>
            <form action={togglePublicarTienda} className="mt-2">
              <input type="hidden" name="id" value={p.id} />
              <button className={`w-full rounded-lg py-2 text-xs font-bold transition active:scale-95 ${p.publicarTienda ? "bg-green-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                {p.publicarTienda ? "✓ En la tienda" : "Publicar en tienda"}
              </button>
            </form>
            {/* Cantidad configurable: mínimo / máximo por pedido */}
            <form action={guardarReglasTienda} className="mt-2 flex items-end gap-1">
              <input type="hidden" name="id" value={p.id} />
              <label className="flex-1 text-[10px] font-bold text-slate-500">Mín
                <input name="minTienda" inputMode="numeric" defaultValue={p.minTienda || 1} className="mt-0.5 w-full rounded border border-slate-300 px-1.5 py-1 text-xs" />
              </label>
              <label className="flex-1 text-[10px] font-bold text-slate-500">Máx
                <input name="maxTienda" inputMode="numeric" defaultValue={p.maxTienda || ""} placeholder="∞" className="mt-0.5 w-full rounded border border-slate-300 px-1.5 py-1 text-xs" />
              </label>
              <button className="rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">OK</button>
            </form>
          </div>
        ))}
      </div>

      {productos.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          No hay productos activos. Créalos primero en el catálogo.
        </p>
      )}
      <p className="mt-4 text-[11px] text-slate-400">💡 Recuerda ponerles precio en la <Link href="/admin/precios" className="font-semibold text-[#1479c4]">lista Web</Link> para que aparezcan con valor en la tienda.</p>
    </div>
  );
}
