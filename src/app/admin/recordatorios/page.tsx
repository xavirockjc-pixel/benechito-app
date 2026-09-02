import { getRecordatorios, type Recordatorio } from "@/lib/recordatorios";

export const dynamic = "force-dynamic";

const waLink = (r: Recordatorio) => `https://wa.me/${r.whatsapp}?text=${encodeURIComponent(r.mensaje)}`;

export default async function RecordatoriosPage() {
  const { reposicion, cobro, preventa, total } = await getRecordatorios();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">🔔 Recordatorios de hoy</h1>
      <p className="text-sm text-slate-500">A quién avisar hoy. Toca “WhatsApp” y envía el mensaje ya escrito.</p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Kpi label="Reponer" valor={reposicion.length} color="#f28a1e" />
        <Kpi label="Cobrar" valor={cobro.length} color="#e23b2c" />
        <Kpi label="Preventa" valor={preventa.length} color="#1479c4" />
      </div>

      {total === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">✅ Nada pendiente hoy. ¡Buen trabajo!</p>
      )}

      <Grupo titulo="🔁 Reponer puntos" items={reposicion} />
      <Grupo titulo="💵 Cobrar" items={cobro} />
      <Grupo titulo="📲 Seguir preventa" items={preventa} />

      <p className="mt-6 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
        💡 Al desplegar en el servidor, estos recordatorios se pueden <b>enviar solos</b> por WhatsApp con n8n (endpoint <code>/api/recordatorios</code>). Por ahora los envías con un toque desde aquí.
      </p>
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: number; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="text-2xl font-extrabold text-slate-900">{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function Grupo({ titulo, items }: { titulo: string; items: Recordatorio[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">{titulo} <span className="text-slate-400">({items.length})</span></h2>
      <ul className="space-y-2">
        {items.map((r) => (
          <li key={`${r.tipo}-${r.negocioId}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-slate-900">{r.negocio}</p>
              <p className="text-xs text-slate-500">
                {r.contacto ? `${r.contacto} · ` : ""}{r.detalle}
                {r.monto ? <b className="text-rose-600"> · ${Math.round(r.monto).toLocaleString("es-CL")}</b> : null}
              </p>
            </div>
            {r.whatsapp ? (
              <a href={waLink(r)} target="_blank" rel="noopener" className="shrink-0 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-extrabold text-white active:scale-95">💬 WhatsApp</a>
            ) : (
              <span className="shrink-0 text-[11px] text-slate-400">sin WhatsApp</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
