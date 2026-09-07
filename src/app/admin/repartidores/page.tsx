import { prisma } from "@/lib/prisma";
import { rolLabel } from "@/lib/dominio/usuarios";
import AutoRefresh from "./AutoRefresh";

export const dynamic = "force-dynamic";

function hace(d: Date | null): { txt: string; color: string } {
  if (!d) return { txt: "sin reportar", color: "#94a3b8" };
  const min = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  const color = min <= 10 ? "#2f9e44" : min <= 60 ? "#f28a1e" : "#e23b2c";
  if (min < 1) return { txt: "recién", color };
  if (min < 60) return { txt: `hace ${min} min`, color };
  const h = Math.floor(min / 60);
  if (h < 24) return { txt: `hace ${h} h`, color };
  return { txt: `hace ${Math.floor(h / 24)} d`, color };
}

export default async function RepartidoresPage() {
  const reps = await prisma.usuario.findMany({
    where: { activo: true, rol: { in: ["vendedor", "chofer", "repartidor"] } },
    select: { id: true, nombre: true, rol: true, ultimaLat: true, ultimaLng: true, ubicacionEn: true },
    orderBy: { nombre: "asc" },
  });

  const conPos = reps.filter((r) => r.ultimaLat != null && r.ultimaLng != null);
  const activos = conPos.filter((r) => r.ubicacionEn && Date.now() - new Date(r.ubicacionEn).getTime() < 15 * 60000).length;

  return (
    <div className="mx-auto max-w-3xl">
      <AutoRefresh seg={25} />
      <div>
        <h1 className="font-display text-2xl font-extrabold text-slate-900">📍 Repartidores <span className="align-middle text-xs font-bold text-emerald-600">● en vivo</span></h1>
        <p className="text-sm text-slate-500">Dónde está cada vendedor/repartidor. Su app reporta la posición en vivo; esta pantalla se actualiza sola cada 25 s.</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Kpi label="En terreno" valor={String(reps.length)} color="#1479c4" />
        <Kpi label="Reportando ahora" valor={String(activos)} color="#2f9e44" />
        <Kpi label="Con ubicación" valor={String(conPos.length)} color="#f28a1e" />
      </div>

      <div className="mt-5 space-y-2">
        {reps.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">No hay vendedores/repartidores activos.</p>}
        {reps.map((r) => {
          const h = hace(r.ubicacionEn);
          const tienePos = r.ultimaLat != null && r.ultimaLng != null;
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg" style={{ background: `${h.color}22` }}>🚚</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{r.nombre} <span className="text-xs font-semibold text-slate-400">{rolLabel[r.rol] ?? r.rol}</span></p>
                <p className="text-xs font-semibold" style={{ color: h.color }}>● {h.txt}</p>
              </div>
              {tienePos ? (
                <a href={`https://www.google.com/maps?q=${r.ultimaLat},${r.ultimaLng}`} target="_blank" rel="noopener noreferrer"
                  className="shrink-0 rounded-lg bg-[#1479c4] px-3 py-2 text-xs font-bold text-white">📍 Ver en mapa</a>
              ) : (
                <span className="shrink-0 text-xs text-slate-400">sin ubicación</span>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-center text-[11px] text-slate-400">🛰️ El repartidor debe tener su app abierta y el permiso de ubicación activado. Toca “Ver en mapa” para abrir su posición en Google Maps.</p>
    </div>
  );
}

function Kpi({ label, valor, color }: { label: string; valor: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm" style={{ borderTopColor: color, borderTopWidth: 3 }}>
      <p className="text-2xl font-extrabold text-slate-900">{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
