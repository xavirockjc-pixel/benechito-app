import Link from "next/link";
import { crearProducto } from "../actions";
import { CamposProducto } from "../campos";

export default function NuevoProducto() {
  return (
    <div>
      <Link href="/admin/productos" className="text-sm font-semibold text-naranja">
        ← Catálogo
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-navy">Nuevo producto</h1>

      <form
        action={crearProducto}
        className="mt-5 max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-crema-2"
      >
        <CamposProducto />
        <button className="mt-5 rounded-full bg-naranja px-6 py-2.5 font-bold text-white shadow-md transition hover:bg-naranja-2">
          Crear producto
        </button>
      </form>
    </div>
  );
}
