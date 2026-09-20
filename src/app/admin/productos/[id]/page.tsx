import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { actualizarProducto, eliminarProducto, guardarPreciosPerfil } from "../actions";
import { CamposProducto } from "../campos";
import { PERFILES_PRECIO } from "@/lib/dominio/precios";

export const dynamic = "force-dynamic";

export default async function EditarProducto({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ precios?: string }>;
}) {
  const { id } = await params;
  const { precios: precioOk } = await searchParams;
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) notFound();

  // Precio actual por perfil (canal) para prellenar.
  const precios = await prisma.precioProducto.findMany({
    where: { productoId: id, cantidadMinima: 1 },
    include: { lista: { select: { canal: true } } },
  });
  const precioPorCanal: Record<string, number> = {};
  for (const p of precios) precioPorCanal[p.lista.canal] = Number(p.precio);

  return (
    <div>
      <Link href="/admin/productos" className="text-sm font-semibold text-naranja">
        ← Catálogo
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-navy">Editar producto</h1>

      <form
        action={actualizarProducto}
        className="mt-5 max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-crema-2"
      >
        <input type="hidden" name="id" value={producto.id} />
        <CamposProducto p={producto} />
        <button className="mt-5 rounded-full bg-naranja px-6 py-2.5 font-bold text-white shadow-md transition hover:bg-naranja-2">
          Guardar cambios
        </button>
      </form>

      {/* Precios por perfil (cada app monta el precio de su perfil) */}
      <form action={guardarPreciosPerfil} className="mt-5 max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-crema-2">
        <input type="hidden" name="id" value={producto.id} />
        <h2 className="text-lg font-extrabold text-navy">💲 Precios por perfil</h2>
        <p className="mt-0.5 text-sm text-slate-500">Pon el precio de cada canal. Déjalo vacío si el producto no se vende en ese perfil. Cada app usa el suyo (Local, Vendedor, Distribuidor, Tienda).</p>
        {precioOk && <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm font-bold text-green-700 ring-1 ring-green-200">✓ Precios guardados</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PERFILES_PRECIO.map((perfil) => (
            <label key={perfil.id} className="text-sm font-bold text-slate-700">{perfil.icono} {perfil.label}
              <div className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-naranja">
                <span className="px-2 text-slate-400">$</span>
                <input name={`precio_${perfil.id}`} inputMode="numeric" defaultValue={precioPorCanal[perfil.id] ?? ""} placeholder="—"
                  className="w-full rounded-r-lg px-1 py-2 text-slate-800 outline-none" />
              </div>
            </label>
          ))}
        </div>
        <button className="mt-4 rounded-full bg-navy px-6 py-2.5 font-bold text-white shadow-md transition hover:brightness-110">
          Guardar precios
        </button>
        <p className="mt-2 text-xs text-slate-400">Para descuentos por cantidad (50, 100, 500…) usa <Link href="/admin/precios" className="font-semibold text-[#1479c4]">Precios → lista → tramos</Link>.</p>
      </form>

      <form action={eliminarProducto} className="mt-4 max-w-2xl">
        <input type="hidden" name="id" value={producto.id} />
        <button className="text-sm font-semibold text-rojo/80 hover:text-rojo">
          Eliminar producto
        </button>
      </form>
    </div>
  );
}
