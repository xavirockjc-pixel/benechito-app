import { prisma } from "@/lib/prisma";
import AgendarForm from "./AgendarForm";
import RetirosDepto from "@/app/_shared/RetirosDepto";
import { fechaCorta } from "@/lib/dominio/agenda";
import { marcarContactado, avanzarAgendado, eliminarAgendado } from "./actions";

export const dynamic = "force-dynamic";

const ESTADO_LABEL: Record<string, string> = {
  pendiente: "Por confirmar",
  en_proceso: "Cargado · llevar",
  hecho: "Entregado",
  cancelado: "Cancelado",
};

function inicioHoy() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function finManana() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function AgendaVendedor({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; cliente?: string }>;
}) {
  const { ok, cliente } = await searchParams;

  // Entregas/exprés de hoy-mañana + próximas visitas (con reserva) más adelante.
  const [agendados, visitas, clientes] = await Promise.all([
    prisma.agenda.findMany({
      where: {
        tipo: { in: ["entrega", "express"] },
        fecha: { gte: inicioHoy(), lte: finManana() },
        estado: { not: "cancelado" },
      },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
    }),
    prisma.agenda.findMany({
      where: { tipo: "visita", fecha: { gte: inicioHoy() }, estado: { in: ["pendiente", "en_proceso"] } },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
      take: 40,
    }),
    prisma.negocio.findMany({
      orderBy: { nombreNegocio: "asc" },
      select: { id: true, nombreNegocio: true, comuna: true, whatsapp: true, nombreContacto: true },
    }),
  ]);

  const negById = new Map(clientes.map((c) => [c.id, c]));
  const hoy0 = inicioHoy();
  const esHoy = (f: Date) => new Date(f) < new Date(hoy0.getTime() + 24 * 3600 * 1000);

  const porCargar = agendados.filter((a) => a.estado !== "hecho");
  const entregados = agendados.filter((a) => a.estado === "hecho");

  return (
    <div>
      <h1 className="text-xl font-extrabold text-slate-900">📅 Agenda de entregas</h1>
      <p className="text-sm text-slate-500">Agenda para hoy o mañana, contacta al cliente y luego carga y lleva.</p>

      {ok && (
        <p className="mt-3 rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">
          ✓ Agendado registrado
        </p>
      )}

      {/* Nueva agenda / pedido exprés */}
      <div className="mt-4">
        <AgendarForm
          clientes={clientes.map((c) => ({ id: c.id, nombreNegocio: c.nombreNegocio, comuna: c.comuna }))}
          clienteInicial={cliente}
        />
      </div>

      {/* Por cargar */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-400">
        Por cargar y llevar ({porCargar.length})
      </h2>
      <div className="space-y-2">
        {porCargar.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            Nada pendiente. Agenda una entrega arriba. 👆
          </p>
        )}
        {porCargar.map((a) => {
          const neg = a.negocioId ? negById.get(a.negocioId) : null;
          const wa = (neg?.whatsapp ?? "").replace(/[^0-9]/g, "");
          const msg = encodeURIComponent(
            `Hola${neg?.nombreContacto ? " " + neg.nombreContacto : ""}, soy de Benechito 🍦. Te confirmo tu ${a.tipo === "express" ? "pedido exprés" : "entrega"}${a.notas ? ": " + a.notas : ""}. ¿A qué hora te llega bien?`,
          );
          return (
            <div
              key={a.id}
              className={`rounded-2xl border-2 bg-white p-4 shadow-sm ${a.tipo === "express" ? "border-orange-300" : "border-slate-200"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-slate-900">{a.titulo}</p>
                  <p className="text-xs text-slate-500">
                    {esHoy(a.fecha) ? "Hoy" : "Mañana"} ·{" "}
                    <span className={a.estado === "en_proceso" ? "font-bold text-green-600" : ""}>
                      {ESTADO_LABEL[a.estado] ?? a.estado}
                    </span>
                  </p>
                </div>
                <form action={eliminarAgendado}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="shrink-0 text-xs font-semibold text-slate-400">Borrar</button>
                </form>
              </div>

              {a.notas && <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">📦 {a.notas}</p>}

              {/* Contacto + acciones */}
              <div className="mt-3 grid grid-cols-2 gap-2">
                {wa ? (
                  <a
                    href={`https://wa.me/${wa}?text=${msg}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white active:brightness-95"
                  >
                    💬 WhatsApp
                  </a>
                ) : (
                  <span className="flex items-center justify-center rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-400">
                    Sin WhatsApp
                  </span>
                )}
                <form action={marcarContactado}>
                  <input type="hidden" name="negocioId" value={a.negocioId ?? ""} />
                  <button className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700 active:bg-slate-200">
                    ✓ Contacté
                  </button>
                </form>
              </div>

              {/* Flujo cargar → entregar */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                {a.estado === "pendiente" ? (
                  <form action={avanzarAgendado} className="contents">
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="a" value="en_proceso" />
                    <button className="col-span-2 rounded-xl bg-[#1479c4] py-2.5 text-sm font-bold text-white active:brightness-95">
                      📦 Marcar cargado
                    </button>
                  </form>
                ) : (
                  <>
                    <form action={avanzarAgendado}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="a" value="pendiente" />
                      <button className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-600 active:bg-slate-200">
                        ↩ Deshacer
                      </button>
                    </form>
                    <form action={avanzarAgendado}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="a" value="hecho" />
                      <button className="w-full rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white active:brightness-95">
                        ✅ Entregado
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Retiros (delivery) despachados a reparto por la central */}
      <RetirosDepto destino="reparto" acento="#1479c4" />

      {/* Próximas visitas con reserva */}
      {visitas.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-400">
            🗓️ Próximas visitas ({visitas.length})
          </h2>
          <div className="space-y-2">
            {visitas.map((v) => {
              const neg = v.negocioId ? negById.get(v.negocioId) : null;
              const wa = (neg?.whatsapp ?? "").replace(/[^0-9]/g, "");
              const msg = encodeURIComponent(
                `Hola${neg?.nombreContacto ? " " + neg.nombreContacto : ""}, soy de Benechito 🍦. Te recuerdo tu reserva${v.notas ? ": " + v.notas : ""}. Paso a verte pronto 😊`,
              );
              return (
                <div key={v.id} className="rounded-2xl border-2 border-violet-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-extrabold text-slate-900">{v.titulo}</p>
                      <p className="text-xs font-bold text-violet-600">📅 {fechaCorta(v.fecha)}</p>
                    </div>
                    <form action={eliminarAgendado}>
                      <input type="hidden" name="id" value={v.id} />
                      <button className="shrink-0 text-xs font-semibold text-slate-400">Borrar</button>
                    </form>
                  </div>
                  {v.notas && <p className="mt-1 rounded-lg bg-violet-50 px-3 py-2 text-sm text-slate-700">🎁 Reserva: {v.notas}</p>}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {wa ? (
                      <a
                        href={`https://wa.me/${wa}?text=${msg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white active:brightness-95"
                      >
                        💬 WhatsApp
                      </a>
                    ) : (
                      <span className="flex items-center justify-center rounded-xl bg-slate-100 py-2.5 text-xs font-semibold text-slate-400">
                        Sin WhatsApp
                      </span>
                    )}
                    <form action={avanzarAgendado}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="a" value="hecho" />
                      <button className="w-full rounded-xl bg-slate-100 py-2.5 text-sm font-bold text-slate-700 active:bg-slate-200">
                        ✓ Visitado
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Entregados hoy/mañana */}
      {entregados.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-400">
            Entregados ({entregados.length})
          </h2>
          <div className="space-y-1">
            {entregados.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2.5">
                <span className="truncate text-sm font-semibold text-slate-500 line-through">{a.titulo}</span>
                <span className="ml-2 shrink-0 text-green-600">✅</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
