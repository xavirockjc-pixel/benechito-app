import Link from "next/link";
import { canalLabel } from "@/lib/dominio/precios";
import { crearLista } from "../actions";

const inputCls =
  "mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30";

const canales = ["sala", "web", "reparto", "negocio", "punto", "revendedor", "distribuidor", "supermercado"];

export default function NuevaLista() {
  return (
    <div>
      <Link href="/admin/precios" className="text-sm font-semibold text-naranja">
        ← Listas de precios
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-navy">Nueva lista de precios</h1>

      <form action={crearLista} className="mt-5 max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-crema-2">
        <label className="block text-sm font-bold text-navy">Nombre *
          <input name="nombre" required placeholder="Ej: Mayorista" className={inputCls} />
        </label>
        <label className="mt-4 block text-sm font-bold text-navy">Canal *
          <select name="canal" required defaultValue="" className={inputCls}>
            <option value="">Selecciona…</option>
            {canales.map((c) => <option key={c} value={c}>{canalLabel[c] ?? c}</option>)}
          </select>
        </label>
        <button className="mt-5 rounded-full bg-naranja px-6 py-2.5 font-bold text-white shadow-md transition hover:bg-naranja-2">
          Crear lista
        </button>
      </form>
    </div>
  );
}
