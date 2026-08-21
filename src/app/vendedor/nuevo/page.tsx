import Link from "next/link";
import { crearClienteRuta } from "../actions";
import CapturarUbicacion from "../CapturarUbicacion";

const inputCls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#1479c4]";

export default function NuevoClienteRuta() {
  return (
    <div>
      <Link href="/vendedor" className="text-sm font-semibold text-[#1479c4]">← Clientes</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">Nuevo cliente</h1>
      <p className="text-xs text-slate-500">Captación en terreno. Con el nombre del negocio basta para empezar.</p>

      <form action={crearClienteRuta} className="mt-4 space-y-3">
        <label className="block text-sm font-bold text-slate-700">Nombre del negocio *
          <input name="nombreNegocio" required className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-sm font-bold text-slate-700">Contacto
          <input name="nombreContacto" className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-sm font-bold text-slate-700">WhatsApp
          <input name="whatsapp" inputMode="tel" placeholder="+56 9 …" className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-sm font-bold text-slate-700">Comuna
          <input name="comuna" className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-sm font-bold text-slate-700">Dirección
          <input name="direccion" className={`mt-1 ${inputCls}`} />
        </label>
        <label className="block text-sm font-bold text-slate-700">Tipo de negocio
          <input name="tipoNegocio" placeholder="Almacén, kiosco…" className={`mt-1 ${inputCls}`} />
        </label>

        <div>
          <p className="mb-1 text-sm font-bold text-slate-700">Ubicación</p>
          <CapturarUbicacion />
        </div>

        <button className="w-full rounded-xl bg-[#1479c4] py-3 text-base font-extrabold text-white shadow active:brightness-95">
          Guardar cliente
        </button>
      </form>
    </div>
  );
}
