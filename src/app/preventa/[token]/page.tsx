import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { rutaDeComuna } from "@/lib/dominio/sectores";
import { CATALOGO_PREVENTA } from "@/lib/dominio/preventa";
import { whatsappLink } from "@/lib/config";
import ResponderPreventa from "./ResponderPreventa";

export const dynamic = "force-dynamic";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/**
 * Página pública (link por WhatsApp, sin clave) donde el CLIENTE responde la preventa:
 * elige los productos que va a necesitar o dice que esta vez pasa. Su respuesta le
 * llega al vendedor a la app y al WhatsApp Benechito.
 */
export default async function PreventaCliente({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ok?: string }>;
}) {
  const { token } = await params;
  const { ok } = await searchParams;

  const negocio = await prisma.negocio.findUnique({
    where: { portalToken: token },
    select: { id: true, nombreNegocio: true, nombreContacto: true, comuna: true, sector: true },
  });
  if (!negocio) notFound();

  // Día de la ruta de este cliente (si está agendada) para decir "pasamos el ...".
  const ruta = rutaDeComuna(negocio.sector || negocio.comuna);
  const rutaDia = ruta.clave ? await prisma.rutaDia.findUnique({ where: { ruta: ruta.clave } }).catch(() => null) : null;
  const diaRuta = rutaDia ? DIAS[rutaDia.dia] : null;

  // Catálogo FIJO de preventa de ruta (los productos que se reponen).
  const items = CATALOGO_PREVENTA.map((p, i) => ({ id: `p${i}`, nombre: p.nombre, sub: p.sub, img: p.img }));

  const nombre = negocio.nombreNegocio || negocio.nombreContacto || "cliente";
  const waBenechito = whatsappLink(`¡Hola Benechito! Soy ${nombre}. `);

  if (ok) {
    const pidio = ok === "pedido";
    return (
      <div className="min-h-screen bg-crema px-4 py-10">
        <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-crema-2">
          <div className="text-6xl">{pidio ? "🐝" : "👋"}</div>
          <h1 className="mt-3 font-display text-2xl font-extrabold text-tinta">{pidio ? "¡Pedido recibido!" : "¡Anotado!"}</h1>
          <p className="mt-2 text-sm text-choco-2">
            {pidio
              ? "Dejamos listo tu pedido para cuando pasemos por tu sector. ¡Gracias! 🙌"
              : "Perfecto, esta vez pasamos de largo y te avisamos la próxima. ¡Gracias por avisar! 😊"}
          </p>
          <a href={waBenechito} target="_blank" rel="noopener noreferrer" className="mt-6 inline-block rounded-2xl bg-[#25D366] px-6 py-3 text-sm font-extrabold text-white active:scale-95">💬 Escribir a Benechito</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-crema pb-12">
      <header className="bg-gradient-to-b from-azul to-[#0f5e9c] px-4 pb-6 pt-8 text-center text-white">
        <img src="/marca/logo.png" alt="Benechito" className="mx-auto h-11 w-auto brightness-0 invert" />
        <h1 className="mt-3 font-display text-2xl font-extrabold leading-tight">Hola, {nombre} 👋</h1>
        <p className="mt-1 text-sm text-white/85">
          {diaRuta ? <>Pasamos por tu sector el <b className="capitalize">{diaRuta}</b> 🛵🍦</> : <>Pronto pasamos por tu sector 🛵🍦</>}
        </p>
      </header>

      <div className="mx-auto -mt-3 max-w-md px-4">
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-crema-2">
          <h2 className="font-display text-lg font-extrabold text-tinta">¿Qué vas a necesitar?</h2>
          <p className="mb-3 text-xs text-choco-2">Marca lo que quieres y te lo dejamos listo. Si esta vez no necesitas, avísanos abajo.</p>
          <ResponderPreventa token={token} items={items} />
        </div>
        <p className="mt-4 text-center text-[11px] text-choco-2">Hecho a lo Benechito ♥</p>
      </div>
    </div>
  );
}
