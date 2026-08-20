import Image from "next/image";
import { site } from "@/lib/config";

export default function Hero() {
  return (
    <section id="inicio" className="relative overflow-hidden">
      {/* Temática pendón: doodles de dulces */}
      <div className="bg-doodles pointer-events-none absolute inset-0 opacity-70" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-azul/10 via-crema/40 to-crema" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-10 md:grid-cols-2 md:py-14">
        {/* Texto */}
        <div className="order-2 md:order-1">
          {/* Logo grande */}
          <Image
            src="/marca/logo.png"
            alt="Benechito — Productos Artesanales Helados"
            width={800}
            height={619}
            priority
            className="mb-5 h-28 w-auto drop-shadow-sm sm:h-36"
          />

          <span className="sello bg-azul/10 text-azul script text-lg">
            {site.mantra} ♥
          </span>
          <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] text-tinta sm:text-5xl">
            Helados y dulces artesanales,{" "}
            <span className="text-azul">hechos a nuestra manera.</span>
          </h1>
          <p className="mt-2 script text-xl text-naranja-2">
            El helado de la Zona del Carbón 🖤
          </p>
          <p className="mt-3 max-w-md text-lg text-tinta/75">
            {site.esencia}. Fabricación propia, sabores abundantes y mucha
            innovación. <strong className="text-naranja-2">Esto debe estar rico.</strong>
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="#helados"
              className="rounded-full bg-azul px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-azul-2 hover:-translate-y-0.5"
            >
              Conoce nuestros productos
            </a>
            <a
              href="#contacto"
              className="rounded-full bg-naranja px-6 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-naranja-2 hover:-translate-y-0.5"
            >
              Quiero un Punto Benechito
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-tinta/70">
            <span>🏭 Fabricación propia</span>
            <span>👐 100% artesanal</span>
            <span>🇨🇱 Hecho en Chile</span>
          </div>
        </div>

        {/* Producto protagonista */}
        <div className="order-1 flex justify-center md:order-2">
          <div className="relative w-full max-w-md">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-naranja/15 blur-2xl" />
            <Image
              src="/productos/variedades.jpg"
              alt="Variedades de paletas Tú y Yo Benechito, 125 ml"
              width={1000}
              height={989}
              priority
              className="relative rounded-3xl shadow-2xl ring-4 ring-white"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
