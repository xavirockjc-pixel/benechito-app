import Image from "next/image";
import { site, whatsappLink } from "@/lib/config";
import {
  lineasHelados,
  saboresHelados,
  comoFunciona,
  beneficios,
  innovacion,
} from "@/lib/benechito";

/* ---------- Conoce Benechito ---------- */
export function ConoceBenechito() {
  const valores = [
    { emoji: "👐", t: "100% artesanal" },
    { emoji: "🍨", t: "Gran variedad de sabores" },
    { emoji: "🏭", t: "Fabricación propia" },
    { emoji: "❤️", t: "Cercanía con el cliente" },
  ];
  return (
    <section id="conoce" className="relative overflow-hidden py-16 md:py-20">
      <div className="bg-doodles pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative mx-auto max-w-4xl px-4 text-center">
        <span className="script text-2xl text-naranja">Conoce Benechito</span>
        <h2 className="mt-1 text-3xl font-extrabold text-tinta sm:text-4xl">
          Una manera de hacer las cosas
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-tinta/75">
          Benechito es una marca chilena de <strong className="text-azul">helados y
          dulces artesanales</strong>, nacida del trabajo familiar y la fabricación
          propia. No queremos ser una marca más: queremos que se note que detrás
          hay personas que hacen las cosas con dedicación, sabor y cariño.
        </p>
        <p className="mx-auto mt-3 max-w-2xl script text-2xl text-azul">
          {site.esencia}
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-tinta/75">
          Lo que nos hace diferentes es nuestra{" "}
          <strong className="text-naranja-2">gran variedad de sabores y
          productos</strong>: helados, paletas, postres, trufas, cuchuflís y
          novedades todo el año. Siempre hay algo nuevo por probar.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {valores.map((v) => (
            <div key={v.t} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-crema-2">
              <div className="text-3xl">{v.emoji}</div>
              <p className="mt-2 text-sm font-bold text-tinta">{v.t}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Nuestros Helados ---------- */
export function Helados() {
  return (
    <section id="helados" className="bg-azul py-16 text-white md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <span className="script text-2xl text-dorado-2">Nuestra raíz</span>
          <h2 className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
            Helados artesanales Benechito 🍦
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Cremosos, abundantes y llenos de sabor. Hechos en nuestra fábrica,
            con textura y color de verdad.
          </p>
        </div>

        {/* Líneas de helado */}
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {lineasHelados.map((l) => (
            <div key={l.nombre} className="overflow-hidden rounded-3xl bg-white shadow-xl">
              <Image
                src={l.img}
                alt={`${l.nombre} Benechito`}
                width={700}
                height={700}
                className="aspect-square w-full object-cover"
              />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-bold text-tinta">{l.nombre}</h3>
                  <span
                    className="rounded-full px-2 py-0.5 text-xs font-bold text-white"
                    style={{ backgroundColor: l.color }}
                  >
                    {l.formato}
                  </span>
                </div>
                <p className="mt-1 text-sm text-tinta/70">{l.texto}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Sabores */}
        <div className="mt-8 rounded-3xl bg-white/10 p-6 ring-1 ring-white/15">
          <h3 className="font-display text-xl font-bold text-dorado-2">
            Y una enorme variedad de sabores
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {saboresHelados.map((s) => (
              <span key={s} className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold text-white">
                {s}
              </span>
            ))}
            <span className="rounded-full bg-naranja px-3 py-1 text-sm font-bold text-white">
              y más…
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Puntos Benechito (propuesta para comercios) ---------- */
export function PuntosBenechito() {
  return (
    <section id="puntos" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="grid items-center gap-10 md:grid-cols-2">
          {/* Góndola real */}
          <div className="order-2 flex justify-center md:order-1">
            <div className="relative">
              <div className="absolute -inset-3 rounded-[2rem] bg-dorado/25 blur-2xl" />
              <Image
                src="/laminas/gondola-negocio.png"
                alt="Góndola dorada Benechito con dulces artesanales, lista para tu negocio"
                width={900}
                height={1300}
                className="relative max-h-[65vh] w-auto rounded-2xl shadow-2xl ring-1 ring-black/5"
              />
            </div>
          </div>

          {/* Propuesta */}
          <div className="order-1 md:order-2">
            <span className="script text-2xl text-naranja">Lleva Benechito a tu negocio</span>
            <h2 className="mt-1 text-3xl font-extrabold text-tinta sm:text-4xl">
              Puntos Benechito
            </h2>
            <p className="mt-4 text-lg text-tinta/75">
              Instalamos una <strong className="text-dorado">góndola dorada</strong> en tu
              almacén, minimarket o kiosco, con nuestros dulces listos para vender.
              Un nuevo punto de venta, sin que tengas que producir nada.
            </p>
            <p className="mt-3 rounded-2xl bg-azul/5 p-4 text-tinta ring-1 ring-azul/10">
              <strong className="text-azul">Nosotros hacemos los productos. Tú les das
              un lugar. Crecemos juntos.</strong>
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {comoFunciona.map((c, i) => (
                <div key={c.titulo} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-crema-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-naranja text-sm font-bold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-tinta">{c.titulo}</p>
                    <p className="text-xs text-tinta/70">{c.texto}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              {beneficios.map((b) => (
                <span key={b.titulo} className="inline-flex items-center gap-1.5 rounded-full bg-crema-2/70 px-3 py-1 text-sm font-semibold text-tinta">
                  <span>{b.icono}</span> {b.titulo}
                </span>
              ))}
            </div>

            <a
              href="#contacto"
              className="mt-7 inline-block rounded-full bg-naranja px-7 py-3.5 text-base font-bold text-white shadow-lg transition hover:bg-naranja-2 hover:-translate-y-0.5"
            >
              Quiero un Punto Benechito
            </a>
            <p className="mt-3 text-sm text-tinta/60">
              Abono inicial $25.000 + saldo $28.900 (instalación y primera reposición).
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Promociones y packs (sin precios) ---------- */
export function Promociones() {
  const combos = [
    { emoji: "🧺", nombre: "Pack para comerciantes", incluye: "Bandejas de cuchuflís, trufas y cocadas (40 unidades c/u)." },
    { emoji: "🍦", nombre: "Combo paletas surtidas", incluye: "Paletas de leche, de agua y Tú y Yo para todos los gustos." },
    { emoji: "⭐", nombre: "Combo paletas premium", incluye: "Paletas premium en sabores a elección: Oreo, frutos rojos y más." },
    { emoji: "🍨", nombre: "Combo postres helados", incluye: "Postres cremosos de 500 ml en varios sabores." },
  ];
  return (
    <section id="promociones" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <span className="script text-2xl text-rojo">Promociones y packs</span>
          <h2 className="mt-1 text-3xl font-extrabold text-tinta sm:text-4xl">
            Combos listos para vender
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-tinta/75">
            Armamos packs con harto producto y variedad para que tu negocio siempre
            tenga qué ofrecer. <strong className="text-azul">Consulta precios y
            armados por WhatsApp.</strong>
          </p>
        </div>

        <div className="mt-10 grid items-center gap-8 md:grid-cols-2">
          {/* Imagen del pack (sin precio) */}
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-crema-2">
            <Image
              src="/productos/pack-sin-precio.jpg"
              alt="Pack Benechito para comerciantes: bandejas de cuchuflís, trufas y cocadas"
              width={1000}
              height={1080}
              className="w-full"
            />
          </div>

          {/* Combos */}
          <div className="grid gap-3">
            {combos.map((c) => (
              <div key={c.nombre} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-crema-2">
                <span className="text-3xl">{c.emoji}</span>
                <div>
                  <p className="font-display text-lg font-bold text-tinta">{c.nombre}</p>
                  <p className="text-sm text-tinta/70">{c.incluye}</p>
                </div>
              </div>
            ))}
            <a
              href={whatsappLink("¡Hola Benechito! Quiero conocer las promociones y packs 🙌")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-verde px-6 py-3 text-base font-bold text-white shadow-lg transition hover:-translate-y-0.5"
            >
              <span className="text-lg">💬</span> Consultar promociones
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Siempre algo nuevo ---------- */
export function Innovacion() {
  return (
    <section id="innovacion" className="bg-crema-2/40 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <span className="script text-2xl text-naranja">Siempre algo nuevo</span>
          <h2 className="mt-1 text-3xl font-extrabold text-tinta sm:text-4xl">
            Siempre estamos preparando algo
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-tinta/75">
            Innovar es parte de nuestra esencia: nuevos sabores, formatos y líneas
            para sorprender a tus clientes durante todo el año.
          </p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {innovacion.map((it) => (
            <div key={it.titulo} className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-crema-2">
              <span className="absolute right-3 top-3 rounded-full bg-rojo px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Nuevo
              </span>
              <div className="text-4xl">{it.emoji}</div>
              <p className="mt-3 font-display text-lg font-bold text-tinta">{it.titulo}</p>
              <p className="mt-1 text-sm text-tinta/70">{it.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Franja WhatsApp rápida ---------- */
export function FranjaWhatsapp() {
  return (
    <section className="bg-verde py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:text-left">
        <p className="text-lg font-bold text-white">
          ¿Quieres Benechito en tu negocio? Escríbenos directo.
        </p>
        <a
          href={whatsappLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-verde shadow-lg transition hover:-translate-y-0.5"
        >
          <span className="text-lg">💬</span> WhatsApp {site.whatsapp.replace(/^56/, "+56 ")}
        </a>
      </div>
    </section>
  );
}
