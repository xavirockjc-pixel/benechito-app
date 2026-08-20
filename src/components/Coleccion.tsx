import Image from "next/image";
import { trufas, cuchuflis } from "@/lib/benechito";

export default function Coleccion() {
  const blancas = trufas.filter((t) => t.base === "blanca");
  const cafes = trufas.filter((t) => t.base === "cafe");

  return (
    <section id="dulces" className="py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <span className="script text-2xl text-rojo">Dulces Benechito</span>
          <h2 className="mt-1 text-3xl font-extrabold text-tinta sm:text-4xl">
            Trufas, cuchuflís y cocadas artesanales
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-tinta/75">
            Nuestra línea de dulces: pequeños bocados con ingredientes reales,
            fruta natural deshidratada y frutos secos. Decorados a mano, uno por
            uno. Ideales para vender por impulso en tu negocio.
          </p>
        </div>

        {/* Base chocolate blanco */}
        <h3 className="mt-12 mb-5 flex items-center gap-2 text-xl font-bold text-navy">
          <span className="h-3 w-3 rounded-full bg-dorado-2" />
          Base chocolate blanco + manjar
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {blancas.map((t) => (
            <SaborCard key={t.nombre} nombre={t.nombre} decorado={t.decorado} color={t.color} />
          ))}
        </div>

        {/* Base chocolate café */}
        <h3 className="mt-10 mb-5 flex items-center gap-2 text-xl font-bold text-navy">
          <span className="h-3 w-3 rounded-full bg-choco" />
          Base chocolate café + manjar
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {cafes.map((t) => (
            <SaborCard key={t.nombre} nombre={t.nombre} decorado={t.decorado} color={t.color} />
          ))}
        </div>

        {/* Cuchuflís */}
        <div className="mt-16 grid items-center gap-8 rounded-3xl bg-choco p-6 text-crema md:grid-cols-2 md:p-10">
          <div>
            <span className="script text-2xl text-dorado-2">El complemento perfecto</span>
            <h3 className="mt-1 text-2xl font-extrabold text-white">
              Cuchuflís artesanales
            </h3>
            <p className="mt-2 text-crema/80">
              Crujientes, rellenos y bañados. Bañados en pack de 5 · rellenos en
              pack de 9.
            </p>
            <ul className="mt-5 space-y-2">
              {cuchuflis.map((c) => (
                <li key={c.nombre} className="flex items-start gap-3">
                  <span className="mt-0.5 rounded-full bg-naranja px-2 py-0.5 text-xs font-bold text-white">
                    {c.tipo}
                  </span>
                  <span className="text-sm">
                    <strong className="text-white">{c.nombre}</strong>
                    <span className="text-crema/70"> — {c.detalle}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <Image
              src="/laminas/coleccion.png"
              alt="Colección completa de trufas y cuchuflís Benechito"
              width={1000}
              height={1400}
              className="rounded-2xl shadow-xl ring-1 ring-white/10"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function SaborCard({
  nombre,
  decorado,
  color,
}: {
  nombre: string;
  decorado: string;
  color: string;
}) {
  return (
    <div className="group rounded-2xl bg-white p-4 shadow-sm ring-1 ring-crema-2 transition hover:-translate-y-1 hover:shadow-md">
      <div
        className="mb-3 h-1.5 w-10 rounded-full"
        style={{ backgroundColor: color }}
      />
      <p className="font-display font-bold text-navy">{nombre}</p>
      <p className="mt-1 text-xs leading-snug text-choco-2">{decorado}</p>
    </div>
  );
}
