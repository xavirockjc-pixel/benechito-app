import { site, whatsappLink } from "@/lib/config";
import ProspectoForm from "./ProspectoForm";

export default function CtaFinal() {
  return (
    <section id="contacto" className="bg-azul-2 py-16 md:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
        <div className="text-white">
          <span className="script text-2xl text-dorado-2">Sumemos tu negocio</span>
          <h2 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
            Lleva Benechito a tu negocio
          </h2>
          <p className="mt-4 max-w-md text-white/85">
            Déjanos tus datos y te contactamos para coordinar la instalación de tu
            Punto Benechito. Nosotros ponemos la góndola y los productos, tú vendes.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-verde px-6 py-3 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5"
            >
              <span className="text-lg">💬</span> Escribir por WhatsApp
            </a>
          </div>

          <a
            href={site.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 block rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 transition hover:bg-white/15"
          >
            <p className="flex items-center gap-2 font-bold text-white">
              <span>📍</span> {site.direccion}
            </p>
            <p className="mt-0.5 text-sm text-white/75">{site.salaVentas}</p>
            <p className="mt-1 text-xs text-white/50">{site.coords} · Ver en el mapa →</p>
          </a>
        </div>

        <ProspectoForm />
      </div>
    </section>
  );
}
