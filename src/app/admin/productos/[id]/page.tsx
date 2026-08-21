import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { actualizarProducto } from "../actions";
import { CamposProducto } from "../campos";

export const dynamic = "force-dynamic";

export default async function EditarProducto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) notFound();

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
    </div>
  );
}
