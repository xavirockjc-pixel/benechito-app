import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { fmtCLP } from "@/lib/dominio/pedidos";
import { tipoClienteLabel } from "@/lib/dominio/precios";
import GuardarUbicacionAqui from "../../GuardarUbicacionAqui";
import { registrarDeuda } from "../../actions";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function ClienteRuta({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await prisma.negocio.findUnique({
    where: { id },
    include: {
      ventas: { include: { pagos: { select: { monto: true } } } },
      actividades: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!cliente) notFound();

  const saldo = cliente.ventas.reduce(
    (s, v) => s + (Number(v.total) - v.pagos.reduce((a, p) => a + Number(p.monto), 0)),
    0,
  );
  const wa = cliente.whatsapp.replace(/[^0-9]/g, "");
  const msgVoy = encodeURIComponent(
    `Hola${cliente.nombreContacto ? " " + cliente.nombreContacto : ""}, soy de Benechito 🍦. Voy en camino a tu local, ¿te encuentro?`,
  );

  return (
    <div>
      <Link href="/vendedor" className="text-sm font-semibold text-[#1479c4]">← Clientes</Link>

      <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-xl font-extrabold text-slate-900">{cliente.nombreNegocio}</h1>
        <p className="text-sm text-slate-500">
          {cliente.nombreContacto} · {cliente.comuna || "—"}
        </p>
        {cliente.direccion && <p className="mt-0.5 text-sm text-slate-600">📌 {cliente.direccion}</p>}
        <p className="text-xs text-slate-400">{tipoClienteLabel[cliente.tipoCliente] ?? cliente.tipoCliente}</p>

        <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
          <span className="text-sm font-semibold text-slate-600">Saldo (deuda)</span>
          <span className={`text-lg font-extrabold ${saldo > 0 ? "text-red-600" : "text-green-600"}`}>
            {fmtCLP(saldo)}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-green-500 py-2.5 text-center text-sm font-bold text-white"
            >
              💬 WhatsApp
            </a>
          )}
          {cliente.latitud && cliente.longitud ? (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${cliente.latitud},${cliente.longitud}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-xl bg-[#1479c4] py-2.5 text-center text-sm font-bold text-white ${wa ? "" : "col-span-2"}`}
            >
              🗺️ Cómo llegar
            </a>
          ) : (
            <span className={`rounded-xl bg-slate-100 py-2.5 text-center text-sm font-semibold text-slate-400 ${wa ? "" : "col-span-2"}`}>
              Sin ubicación
            </span>
          )}
        </div>

        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${msgVoy}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-center text-xs font-semibold text-slate-400 underline"
          >
            avisar al cliente que voy (opcional)
          </a>
        )}

        <div className="mt-2">
          <GuardarUbicacionAqui negocioId={cliente.id} />
        </div>
      </div>

      {/* Acciones grandes */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link href={`/vendedor/cliente/${cliente.id}/vender`} className="rounded-2xl bg-[#1479c4] py-6 text-center text-base font-extrabold text-white shadow active:brightness-95">
          🛒<br />Vender
        </Link>
        <Link href={`/vendedor/cliente/${cliente.id}/cobrar`} className={`rounded-2xl py-6 text-center text-base font-extrabold text-white shadow active:brightness-95 ${saldo > 0 ? "bg-amber-500" : "bg-slate-300"}`}>
          💵<br />Cobrar
        </Link>
        <Link href={`/vendedor/cliente/${cliente.id}/resultado`} className="rounded-2xl border-2 border-slate-200 bg-white py-6 text-center text-base font-extrabold text-slate-700 active:bg-slate-50">
          📝<br />Resultado
        </Link>
        <Link href={`/vendedor/cliente/${cliente.id}/reponer`} className="rounded-2xl border-2 border-slate-200 bg-white py-6 text-center text-base font-extrabold text-slate-700 active:bg-slate-50">
          🍫<br />Reponer
        </Link>
      </div>

      {/* Agendar entrega para hoy/mañana */}
      <Link
        href={`/vendedor/agenda?cliente=${cliente.id}`}
        className="mt-3 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#1479c4] py-3 text-sm font-extrabold text-[#1479c4] active:bg-blue-50"
      >
        📅 Agendar entrega / pedido
      </Link>

      {/* Registrar deuda directa (saldo anterior / cargo) */}
      <details className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-extrabold text-slate-700">➕ Registrar deuda (saldo anterior)</summary>
        <form action={registrarDeuda} className="mt-3 space-y-2">
          <input type="hidden" name="negocioId" value={cliente.id} />
          <input type="hidden" name="volver" value={`/vendedor/cliente/${cliente.id}`} />
          <label className="block text-xs font-bold text-slate-600">Monto que debe
            <input name="monto" inputMode="numeric" required placeholder="Ej: 50000" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#1479c4]" />
          </label>
          <label className="block text-xs font-bold text-slate-600">Concepto (opcional)
            <input name="motivo" placeholder="Ej: Deuda de antes / pedido pasado" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#1479c4]" />
          </label>
          <button className="w-full rounded-xl bg-red-500 py-3 text-sm font-extrabold text-white active:brightness-95">Registrar deuda</button>
        </form>
      </details>

      {/* Actividad reciente */}
      {cliente.actividades.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Últimas visitas</h2>
          <ul className="space-y-1">
            {cliente.actividades.map((a) => (
              <li key={a.id} className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                <p className="text-slate-700">{a.descripcion}</p>
                <p className="text-xs text-slate-400">{fmtHora(a.createdAt)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
