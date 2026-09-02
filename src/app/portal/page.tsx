import { prisma } from "@/lib/prisma";
import { registrarNegocioPortal } from "./actions";
import UbicacionCliente from "../tienda/UbicacionCliente";

export const dynamic = "force-dynamic";

const BENEFICIOS = [
  { icono: "🏷️", titulo: "Precios mayoristas", texto: "Accede a la lista de precios por volumen según tu tipo de negocio." },
  { icono: "🛵", titulo: "Reparto y retiro", texto: "Coordina despacho a tu local o retiro en fábrica." },
  { icono: "🍫", titulo: "Catálogo completo", texto: "Trufas, postres, paletas, cuchuflís y más, listos para revender." },
  { icono: "🤝", titulo: "Atención directa", texto: "Un contacto directo con la fábrica, sin intermediarios." },
];

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const empresa = await prisma.empresa.findFirst();
  const marca = empresa?.nombre ?? "Benechito";

  return (
    <div className="min-h-screen bg-crema">
      {/* Encabezado */}
      <header className="bg-azul px-4 py-8 text-center text-white">
        <img src="/marca/logo.png" alt={marca} className="mx-auto h-14 w-auto" />
        <h1 className="mt-3 font-display text-2xl font-extrabold">Portal de Negocios</h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-white/85">
          ¿Tienes un negocio, kiosco o ruta? Únete como revendedor o distribuidor {marca} y compra con precios mayoristas.
        </p>
      </header>

      <div className="mx-auto max-w-md px-4 py-6">
        {/* Beneficios */}
        <div className="grid grid-cols-2 gap-3">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-crema-2">
              <div className="text-2xl">{b.icono}</div>
              <p className="mt-1 text-sm font-extrabold text-choco">{b.titulo}</p>
              <p className="text-xs text-choco-2">{b.texto}</p>
            </div>
          ))}
        </div>

        {/* Formulario */}
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-crema-2">
          <h2 className="font-display text-lg font-extrabold text-choco">Registra tu negocio</h2>
          <p className="text-xs text-choco-2">Te contactamos para activar tu cuenta y coordinar tu primer pedido.</p>

          {error === "datos" && (
            <p className="mt-3 rounded-lg bg-naranja/15 px-3 py-2 text-xs font-bold text-naranja">
              Faltan datos: el nombre del negocio y el WhatsApp son obligatorios.
            </p>
          )}

          <form action={registrarNegocioPortal} className="mt-4 space-y-3">
            <label className="block text-xs font-bold text-choco-2">
              Nombre del negocio *
              <input name="nombreNegocio" required placeholder="Ej: Kiosco Doña Rosa"
                className="mt-1 w-full rounded-lg border border-crema-2 bg-white px-3 py-2.5 text-sm text-choco outline-none focus:border-naranja" />
            </label>

            <label className="block text-xs font-bold text-choco-2">
              Tu nombre
              <input name="nombreContacto" placeholder="Ej: Rosa Pérez"
                className="mt-1 w-full rounded-lg border border-crema-2 bg-white px-3 py-2.5 text-sm text-choco outline-none focus:border-naranja" />
            </label>

            <label className="block text-xs font-bold text-choco-2">
              WhatsApp *
              <input name="whatsapp" required inputMode="tel" placeholder="+56 9 1234 5678"
                className="mt-1 w-full rounded-lg border border-crema-2 bg-white px-3 py-2.5 text-sm text-choco outline-none focus:border-naranja" />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-bold text-choco-2">
                Comuna
                <input name="comuna" placeholder="Ej: Maipú"
                  className="mt-1 w-full rounded-lg border border-crema-2 bg-white px-3 py-2.5 text-sm text-choco outline-none focus:border-naranja" />
              </label>
              <label className="block text-xs font-bold text-choco-2">
                ¿Qué te interesa?
                <select name="compra" defaultValue=""
                  className="mt-1 w-full rounded-lg border border-crema-2 bg-white px-3 py-2.5 text-sm text-choco outline-none focus:border-naranja">
                  <option value="">— Elige —</option>
                  <option value="dulce">Dulces</option>
                  <option value="helado">Helados</option>
                  <option value="ambos">Ambos</option>
                </select>
              </label>
            </div>

            <label className="block text-xs font-bold text-choco-2">
              Dirección (para despacho o retiro)
              <input name="direccion" placeholder="Calle, número, referencia"
                className="mt-1 w-full rounded-lg border border-crema-2 bg-white px-3 py-2.5 text-sm text-choco outline-none focus:border-naranja" />
            </label>

            {/* Tipo de negocio */}
            <fieldset className="text-xs font-bold text-choco-2">
              <legend className="mb-1">¿Cómo comprarías?</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { v: "revendedor", l: "🛒 Revendedor / ruta" },
                  { v: "negocio", l: "🏪 Negocio con local" },
                  { v: "distribuidor", l: "🚚 Distribuidor" },
                  { v: "otro", l: "❓ Otro" },
                ].map((o, i) => (
                  <label key={o.v} className="flex cursor-pointer items-center gap-2 rounded-lg border border-crema-2 px-3 py-2 text-choco has-[:checked]:border-naranja has-[:checked]:bg-naranja/10">
                    <input type="radio" name="tipo" value={o.v} defaultChecked={i === 0} className="accent-naranja" />
                    <span className="text-[13px] font-semibold">{o.l}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block text-xs font-bold text-choco-2">
              Mensaje (opcional)
              <textarea name="observaciones" rows={2} placeholder="Cuéntanos de tu negocio, volumen estimado, etc."
                className="mt-1 w-full rounded-lg border border-crema-2 bg-white px-3 py-2.5 text-sm text-choco outline-none focus:border-naranja" />
            </label>

            {/* Ubicación opcional (GPS o link de Google Maps) */}
            <UbicacionCliente titulo="📍 Comparte tu ubicación (opcional)" />

            <button className="w-full rounded-full bg-naranja py-3.5 text-sm font-extrabold text-white active:scale-95">
              Registrar mi negocio →
            </button>
            <p className="text-center text-[11px] text-choco-2">Al registrarte aceptas que te contactemos por WhatsApp.</p>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-choco-2">
          ¿Buscas comprar al detalle? <a href="/tienda" className="font-bold text-azul">Ir a la tienda →</a>
        </p>
      </div>
    </div>
  );
}
