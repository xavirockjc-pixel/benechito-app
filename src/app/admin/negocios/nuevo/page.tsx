import Link from "next/link";
import { ESTADOS, estadoMeta } from "@/lib/estados";
import { crearNegocio } from "../actions";

const tipos = ["Almacén", "Minimarket", "Kiosco", "Botillería", "Panadería", "Cafetería", "Food truck", "Otro"];

export default function NuevoNegocio() {
  return (
    <div>
      <Link href="/admin/negocios" className="text-sm font-semibold text-naranja">
        ← Volver
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-navy">Nuevo negocio</h1>

      <form action={crearNegocio} className="mt-5 max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-crema-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Nombre de contacto" name="nombreContacto" required />
          <Campo label="Nombre del negocio" name="nombreNegocio" required />
          <Campo label="WhatsApp" name="whatsapp" required />
          <Campo label="Comuna" name="comuna" required />
          <Campo label="Ciudad" name="ciudad" />
          <Campo label="Dirección" name="direccion" />

          <Select label="Tipo de negocio" name="tipoNegocio" options={tipos} />
          <Select
            label="Estado inicial"
            name="estado"
            options={ESTADOS.map((e) => estadoMeta[e].label)}
            values={[...ESTADOS]}
          />
        </div>

        <label className="mt-4 flex items-center gap-3 text-sm font-semibold text-navy">
          <input type="checkbox" name="interesHelados" value="si" className="h-5 w-5 accent-naranja" />
          Interesado en helados 🍦
        </label>

        <label className="mt-4 block text-sm font-bold text-navy">
          Observaciones
          <textarea
            name="observaciones"
            rows={3}
            className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30"
          />
        </label>

        <button className="mt-5 rounded-full bg-naranja px-6 py-2.5 font-bold text-white shadow-md transition hover:bg-naranja-2">
          Crear negocio
        </button>
      </form>
    </div>
  );
}

function Campo({ label, name, required }: { label: string; name: string; required?: boolean }) {
  return (
    <label className="text-sm font-bold text-navy">
      {label}{required && " *"}
      <input
        name={name}
        required={required}
        className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30"
      />
    </label>
  );
}

function Select({
  label,
  name,
  options,
  values,
}: {
  label: string;
  name: string;
  options: string[];
  values?: string[];
}) {
  return (
    <label className="text-sm font-bold text-navy">
      {label}
      <select
        name={name}
        defaultValue=""
        className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30"
      >
        <option value="">Selecciona…</option>
        {options.map((o, i) => (
          <option key={o} value={values ? values[i] : o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
