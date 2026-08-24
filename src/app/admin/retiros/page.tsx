import { prisma } from "@/lib/prisma";
import {
  canalIcono, canalLabel, destinoIcono, destinoLabel, DESTINOS, estadoAgendaLabel, fechaCorta,
} from "@/lib/dominio/agenda";
import CapturarRetiro from "./CapturarRetiro";
import { despacharRetiro, avanzarRetiro, eliminarRetiro } from "@/app/_shared/retiros-actions";

export const dynamic = "force-dynamic";

export default async function RetirosCentral() {
  const desde = new Date();
  desde.setDate(desde.getDate() - 1);
  desde.setHours(0, 0, 0, 0);

  const [retiros, clientes] = await Promise.all([
    prisma.agenda.findMany({
      where: { tipo: "retiro", fecha: { gte: desde }, estado: { not: "cancelado" } },
      orderBy: [{ fecha: "asc" }, { createdAt: "asc" }],
    }),
    prisma.negocio.findMany({ orderBy: { nombreNegocio: "asc" }, select: { id: true, nombreNegocio: true, comuna: true, whatsapp: true } }),
  ]);

  const negById = new Map(clientes.map((c) => [c.id, c]));
  const sinDespachar = retiros.filter((r) => !r.destino || r.destino === "central");
  const despachados = retiros.filter((r) => r.destino && r.destino !== "central" && r.estado !== "hecho");
  const listos = retiros.filter((r) => r.estado === "hecho");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🧾 Pedidos de retiro</h1>
      <p className="text-sm text-slate-500">
        Los pedidos que entran por WhatsApp, Facebook o Instagram caen aquí. Despáchalos a Local,
        Bodega o Reparto y a ese departamento le aparece en su app.
      </p>

      <div className="mt-5">
        <CapturarRetiro clientes={clientes.map((c) => ({ id: c.id, nombreNegocio: c.nombreNegocio, comuna: c.comuna }))} />
      </div>

      {/* Sin despachar */}
      <h2 className="mb-2 mt-7 text-sm font-bold uppercase tracking-wide text-slate-500">
        ⏸️ Sin despachar ({sinDespachar.length})
      </h2>
      <div className="space-y-2">
        {sinDespachar.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
            Todo despachado. 🎉
          </p>
        )}
        {sinDespachar.map((r) => (
          <div key={r.id} className="rounded-2xl border-2 border-amber-300 bg-white p-4 shadow-sm">
            <RetiroCabecera r={r} negById={negById} />
            {r.notas && <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">📦 {r.notas}</p>}
            <p className="mt-3 mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Despachar a</p>
            <div className="grid grid-cols-3 gap-2">
              {DESTINOS.map((d) => (
                <form key={d} action={despacharRetiro}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="destino" value={d} />
                  <button className="w-full rounded-xl bg-[#1479c4] py-2.5 text-sm font-bold text-white active:brightness-110">
                    {destinoIcono[d]} {destinoLabel[d].split(" ")[0]}
                  </button>
                </form>
              ))}
            </div>
            <form action={eliminarRetiro} className="mt-2 text-right">
              <input type="hidden" name="id" value={r.id} />
              <button className="text-xs font-semibold text-slate-400">Borrar</button>
            </form>
          </div>
        ))}
      </div>

      {/* Despachados en curso */}
      <h2 className="mb-2 mt-7 text-sm font-bold uppercase tracking-wide text-slate-500">
        🚀 Despachados en curso ({despachados.length})
      </h2>
      <div className="space-y-2">
        {despachados.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
            Nada en curso.
          </p>
        )}
        {despachados.map((r) => (
          <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <RetiroCabecera r={r} negById={negById} />
              <span className="shrink-0 rounded-lg px-2 py-1 text-xs font-extrabold text-white" style={{ backgroundColor: "#1479c4" }}>
                {destinoIcono[r.destino!]} {destinoLabel[r.destino!].split(" ")[0]}
              </span>
            </div>
            {r.notas && <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">📦 {r.notas}</p>}
            <p className="mt-2 text-xs text-slate-500">Estado: <b>{estadoAgendaLabel[r.estado]}</b></p>
            {/* Reasignar destino */}
            <div className="mt-2 flex flex-wrap gap-2">
              {DESTINOS.filter((d) => d !== r.destino).map((d) => (
                <form key={d} action={despacharRetiro}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="destino" value={d} />
                  <button className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 active:bg-slate-200">
                    → {destinoIcono[d]} {destinoLabel[d].split(" ")[0]}
                  </button>
                </form>
              ))}
              <form action={avanzarRetiro}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="a" value="hecho" />
                <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white active:brightness-95">✅ Cerrar</button>
              </form>
            </div>
          </div>
        ))}
      </div>

      {listos.length > 0 && (
        <>
          <h2 className="mb-2 mt-7 text-sm font-bold uppercase tracking-wide text-slate-500">✅ Cerrados hoy ({listos.length})</h2>
          <div className="space-y-1">
            {listos.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-2.5">
                <span className="truncate text-sm font-semibold text-slate-500 line-through">{r.titulo}</span>
                <span className="ml-2 shrink-0 text-xs text-slate-400">{r.destino ? destinoLabel[r.destino].split(" ")[0] : ""}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RetiroCabecera({
  r,
  negById,
}: {
  r: { titulo: string; fecha: Date; canal: string | null; contacto: string | null; negocioId: string | null };
  negById: Map<string, { whatsapp: string }>;
}) {
  const neg = r.negocioId ? negById.get(r.negocioId) : null;
  const wa = (neg?.whatsapp ?? "").replace(/[^0-9]/g, "");
  return (
    <div className="min-w-0">
      <p className="truncate font-extrabold text-slate-900">{r.titulo}</p>
      <p className="text-xs text-slate-500">
        {fechaCorta(r.fecha)} · {canalIcono[r.canal ?? "manual"]} {canalLabel[r.canal ?? "manual"]}
        {r.contacto ? ` · ${r.contacto}` : ""}
        {wa ? (
          <>
            {" · "}
            <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="font-semibold text-green-600">
              💬 escribir
            </a>
          </>
        ) : null}
      </p>
    </div>
  );
}
