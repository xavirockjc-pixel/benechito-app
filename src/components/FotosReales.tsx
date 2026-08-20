import Image from "next/image";
import { site } from "@/lib/config";

export default function FotosReales() {
  return (
    <section className="bg-crema-2/40 py-16 md:py-24">
      <div className="mx-auto grid max-w-5xl items-center gap-10 px-4 md:grid-cols-2">
        {/* Imagen real de la góndola en el negocio */}
        <div className="order-2 flex justify-center md:order-1">
          <div className="relative">
            <div className="absolute -inset-3 rounded-[2rem] bg-dorado/25 blur-2xl" />
            <Image
              src="/fotos/punto-en-negocio.jpg"
              alt="Góndola Benechito instalada y surtida en un negocio"
              width={315}
              height={1200}
              className="relative max-h-[70vh] w-auto rounded-2xl shadow-2xl ring-1 ring-black/5"
            />
          </div>
        </div>

        {/* Texto */}
        <div className="order-1 md:order-2">
          <span className="script text-2xl text-naranja">Esto no es un render</span>
          <h2 className="mt-1 text-3xl font-extrabold text-navy sm:text-4xl">
            Así se ve un Punto Benechito en tu negocio
          </h2>
          <p className="mt-4 text-lg text-choco-2">
            Una góndola dorada, surtida y ordenada, que llama la atención apenas
            entras. Ocupa poco espacio y trabaja sola generando compra por impulso.
          </p>
          <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 shadow-sm ring-1 ring-crema-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-verde text-white text-sm font-bold">
              ✓
            </span>
            <span className="text-sm font-bold text-navy">
              Funcionando hoy en {site.puntosActivos} negocios
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
