import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toggleNoCobrar } from "./actions";

export const dynamic = "force-dynamic";

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");
const num = (v: unknown) => Number(v ?? 0);
const dias = (d: Date) => Math.floor((Date.now() - new Date(d).getTime()) / 864e5);

/** Normaliza el WhatsApp chileno a formato wa.me (con 56). */
function waNumero(w: string) {
  const d = (w || "").replace(/\D/g, "");
  if (d.startsWith("56")) return d;
  if (d.length === 9 && d.startsWith("9")) return "56" + d;
  if (d.length === 8) return "569" + d;
  return d;
}

export default async function CobranzaPage() {
  const ventas = await prisma.venta.findMany({
    where: { estadoPago: { in: ["pendiente", "parcial", "vencido"] } },
    include: {
      negocio: { select: { id: true, nombreNegocio: true, nombreContacto: true, whatsapp: true, noCobrar: true, motivoNoCobrar: true } },
      pagos: { select: { monto: true } },
    },
    orderBy: { fecha: "asc" },
  });

  type Cli = { id: string; nombre: string; contacto: string; whatsapp: string; deuda: number; nventas: number; masVieja: Date; vencidas: number };
  const mapa = new Map<string, Cli>();
  for (const v of ventas) {
    if (v.negocio.noCobrar) continue; // en pausa
    const saldo = num(v.total) - v.pagos.reduce((s, p) => s + num(p.monto), 0);
    if (saldo <= 0) continue;
    const k = v.negocio.id;
    const c = mapa.get(k) ?? { id: k, nombre: v.negocio.nombreNegocio, contacto: v.negocio.nombreContacto, whatsapp: v.negocio.whatsapp, deuda: 0, nventas: 0, masVieja: v.fecha, vencidas: 0 };
    c.deuda += saldo; c.nventas += 1;
    if (new Date(v.fecha) < new Date(c.masVieja)) c.masVieja = v.fecha;
    if (v.estadoPago === "vencido") c.vencidas += 1;
    mapa.set(k, c);
  }
  const clientes = [...mapa.values()].sort((a, b) => b.deuda - a.deuda);
  const totalPorCobrar = clientes.reduce((s, c) => s + c.deuda, 0);

  // Clientes en pausa
  const enPausa = await prisma.negocio.findMany({
    where: { noCobrar: true },
    select: { id: true, nombreNegocio: true, motivoNoCobrar: true },
    orderBy: { nombreNegocio: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">💸 Cobranza</h1>
        <p className="text-sm text-slate-500">El sistema <b>prepara</b> el recordatorio; tú decides a quién y cuándo enviarlo. Nada se manda solo.</p>
      </div>

      {/* KPIs */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Kpi label="Total por cobrar" valor={CLP(totalPorCobrar)} color="#e23b2c" />
        <Kpi label="Clientes" valor={String(clientes.length)} color="#1479c4" />
        <Kpi label="En pausa" valor={String(enPausa.length)} color="#94a3b8" />
      </div>

      <p className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800">
        💡 ¿Piloto o producto no validado? Pon al cliente <b>en pausa</b> y no aparecerá aquí hasta que lo reactives.
      </p>

      {/* Lista por cobrar */}
      <div className="mt-4 space-y-2">
        {clientes.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">🎉 Nada por cobrar.</p>}
        {clientes.map((c) => {
          const d = dias(c.masVieja);
          const msg = `Hola ${c.contacto} 👋, te recordamos el saldo pendiente de ${CLP(c.deuda)} con Benechito 🐝. Cuando puedas, ¡muchas gracias! 🙌`;
          const href = `https://wa.me/${waNumero(c.whatsapp)}?text=${encodeURIComponent(msg)}`;
          return (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">{c.nombre}</p>
                  <p className="text-xs text-slate-400">{c.contacto} · {c.nventas} venta(s) · más antigua hace {d} d{c.vencidas > 0 ? <span className="font-bold text-rose-600"> · {c.vencidas} vencida(s)</span> : null}</p>
                </div>
                <span className="shrink-0 text-right text-base font-extrabold text-rose-600 tabular-nums">{CLP(c.deuda)}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a href={href} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-extrabold text-white active:scale-95">📲 Enviar recordatorio</a>
                <details className="text-xs">
                  <summary className="cursor-pointer font-bold text-slate-500">⏸️ Pausar</summary>
                  <form action={toggleNoCobrar} className="mt-2 flex items-center gap-2">
                    <input type="hidden" name="negocioId" value={c.id} />
                    <input type="hidden" name="pausar" value="true" />
                    <input name="motivo" placeholder="motivo (piloto, no validado…)" className="w-52 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                    <button className="rounded-lg bg-slate-700 px-3 py-1 text-xs font-bold text-white">Pausar</button>
                  </form>
                </details>
                <Link href={`/admin/negocios/${c.id}`} className="text-xs font-bold text-slate-400 hover:text-slate-600">ver cliente →</Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* En pausa */}
      {enPausa.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-400">⏸️ En pausa</h2>
          <ul className="space-y-2">
            {enPausa.map((n) => (
              <li key={n.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-700">{n.nombreNegocio}</span>{n.motivoNoCobrar && <span className="block truncate text-xs text-slate-400">{n.motivoNoCobrar}</span>}</span>
                <form action={toggleNoCobrar}>
                  <input type="hidden" name="negocioId" value={n.id} />
                  <input type="hidden" name="pausar" value="false" />
                  <button className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100">▶️ Reactivar</button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="text-lg font-extrabold text-slate-900 tabular-nums">{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
