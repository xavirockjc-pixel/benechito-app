import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ESTADOS, estadoMeta, type Estado } from "@/lib/estados";
import {
  cambiarEstado,
  agregarNota,
  registrarReposicion,
  eliminarNegocio,
  actualizarClasificacion,
} from "../actions";
import { TIPOS_CLIENTE, tipoClienteLabel, canalLabel } from "@/lib/dominio/precios";

export const dynamic = "force-dynamic";

const fmt = (d: Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtHora = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function FichaNegocio({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const negocio = await prisma.negocio.findUnique({
    where: { id },
    include: {
      actividades: { orderBy: { createdAt: "desc" } },
      productos: { include: { producto: true } },
      reposiciones: { orderBy: { fecha: "desc" }, take: 5 },
    },
  });

  if (!negocio) notFound();
  const meta = estadoMeta[negocio.estado as Estado];
  const waLink = `https://wa.me/${negocio.whatsapp.replace(/[^0-9]/g, "")}`;

  const listas = await prisma.listaPrecio.findMany({
    where: { activo: true },
    orderBy: { nombre: "asc" },
  });

  return (
    <div>
      <Link href="/admin/negocios" className="text-sm font-semibold text-naranja">
        ← Negocios
      </Link>

      {/* Encabezado */}
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-navy">{negocio.nombreNegocio}</h1>
          <p className="text-choco-2">
            {negocio.nombreContacto} · {negocio.comuna}
            {negocio.ciudad ? `, ${negocio.ciudad}` : ""}
          </p>
        </div>
        <span
          className="rounded-lg px-3 py-1.5 text-sm font-bold"
          style={{ color: meta?.color, backgroundColor: meta?.bg }}
        >
          {meta?.label ?? negocio.estado}
        </span>
      </div>

      {/* Acciones rápidas */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-verde px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5"
        >
          💬 WhatsApp
        </a>
        <form action={cambiarEstado} className="flex items-center gap-2">
          <input type="hidden" name="id" value={negocio.id} />
          <select
            name="estado"
            defaultValue={negocio.estado}
            className="rounded-full border border-crema-2 bg-white px-3 py-2 text-sm font-semibold text-navy outline-none focus:border-naranja"
          >
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{estadoMeta[e].label}</option>
            ))}
          </select>
          <button className="rounded-full bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-2">
            Cambiar estado
          </button>
        </form>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Columna izquierda: datos + fechas + productos */}
        <div className="space-y-5 lg:col-span-2">
          {/* Datos */}
          <Card titulo="Datos">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Dato label="WhatsApp" valor={negocio.whatsapp} />
              <Dato label="Tipo de negocio" valor={negocio.tipoNegocio ?? "—"} />
              <Dato label="Dirección" valor={negocio.direccion ?? "—"} />
              <Dato label="Interés declarado" valor={negocio.interesPunto ?? "—"} />
              <Dato label="Interés en helados" valor={negocio.interesHelados ? "Sí 🍦" : "No"} />
              <Dato label="Origen" valor={negocio.origen} />
            </dl>
          </Card>

          {/* Clasificación comercial */}
          <Card titulo="Clasificación comercial">
            <p className="mb-3 text-sm text-choco-2">
              El tipo de cliente y la lista de precios determinan qué precio se le aplica en pedidos y
              POS. Si no asignas una lista, el sistema usa la del canal según el tipo.
            </p>
            <form
              action={actualizarClasificacion}
              className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
            >
              <input type="hidden" name="id" value={negocio.id} />
              <label className="text-sm font-bold text-navy">
                Tipo de cliente
                <select
                  name="tipoCliente"
                  defaultValue={negocio.tipoCliente}
                  className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2 font-normal text-choco outline-none focus:border-naranja"
                >
                  {TIPOS_CLIENTE.map((t) => (
                    <option key={t} value={t}>{tipoClienteLabel[t]}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm font-bold text-navy">
                Lista de precios
                <select
                  name="listaPrecioId"
                  defaultValue={negocio.listaPrecioId ?? ""}
                  className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2 font-normal text-choco outline-none focus:border-naranja"
                >
                  <option value="">Automática (según tipo)</option>
                  {listas.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre} · {canalLabel[l.canal] ?? l.canal}
                    </option>
                  ))}
                </select>
              </label>
              <button className="rounded-full bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-2">
                Guardar
              </button>
            </form>
          </Card>

          {/* Fechas */}
          <Card titulo="Fechas">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Dato label="Ingreso" valor={fmt(negocio.fechaIngreso)} />
              <Dato label="Instalación" valor={fmt(negocio.fechaInstalacion)} />
              <Dato label="Última reposición" valor={fmt(negocio.ultimaReposicion)} />
              <Dato label="Próxima reposición" valor={fmt(negocio.proximaReposicion)} />
            </dl>
          </Card>

          {/* Productos instalados */}
          <Card titulo="Productos instalados en la góndola">
            {negocio.productos.length === 0 ? (
              <p className="text-sm text-choco-2">
                Aún no se registran productos instalados. (Se podrá gestionar el
                detalle de la góndola en la siguiente fase del inventario.)
              </p>
            ) : (
              <ul className="divide-y divide-crema-2 text-sm">
                {negocio.productos.map((pp) => (
                  <li key={pp.id} className="flex justify-between py-2">
                    <span className="font-semibold text-navy">
                      {pp.producto.nombre}{" "}
                      <span className="text-choco-2">({pp.producto.linea})</span>
                    </span>
                    <span className="text-choco-2">{pp.cantidadInstalada} u.</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Reposición */}
          <Card titulo="Registrar reposición">
            <form action={registrarReposicion} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <input type="hidden" name="id" value={negocio.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold text-navy">
                  Próxima reposición
                  <input
                    type="date"
                    name="proxima"
                    className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2 font-normal text-choco outline-none focus:border-naranja"
                  />
                </label>
                <label className="text-sm font-bold text-navy">
                  Notas
                  <input
                    name="notas"
                    placeholder="Qué se repuso…"
                    className="mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2 font-normal text-choco outline-none focus:border-naranja"
                  />
                </label>
              </div>
              <button className="rounded-full bg-naranja px-4 py-2 text-sm font-bold text-white transition hover:bg-naranja-2">
                Registrar
              </button>
            </form>
          </Card>
        </div>

        {/* Columna derecha: historial + nota */}
        <div className="space-y-5">
          <Card titulo="Agregar nota">
            <form action={agregarNota} className="space-y-2">
              <input type="hidden" name="id" value={negocio.id} />
              <textarea
                name="nota"
                rows={3}
                required
                placeholder="Escribe una nota…"
                className="w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2 text-sm outline-none focus:border-naranja"
              />
              <button className="w-full rounded-full bg-navy px-4 py-2 text-sm font-bold text-white transition hover:bg-navy-2">
                Guardar nota
              </button>
            </form>
          </Card>

          <Card titulo="Historial">
            <ol className="space-y-3">
              {negocio.actividades.map((a) => (
                <li key={a.id} className="border-l-2 border-crema-2 pl-3">
                  <p className="text-sm text-navy">{a.descripcion}</p>
                  <p className="text-xs text-choco-2">{fmtHora(a.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Card>

          <form action={eliminarNegocio}>
            <input type="hidden" name="id" value={negocio.id} />
            <button className="text-sm font-semibold text-rojo/80 hover:text-rojo">
              Eliminar negocio
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-crema-2">
      <h2 className="mb-3 font-display text-lg font-bold text-navy">{titulo}</h2>
      {children}
    </section>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-choco-2">{label}</dt>
      <dd className="font-semibold text-navy">{valor}</dd>
    </div>
  );
}
