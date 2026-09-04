import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  AREAS_NOTA, areaNotaLabel, areaNotaIcono,
  TIPOS_NOTA, tipoNotaLabel, tipoNotaIcono,
} from "@/lib/dominio/notas";
import { prioridadLabel, prioridadColor } from "@/lib/dominio/mejoras";
import { toggleNota, eliminarNota } from "@/app/notas/actions";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

type SP = { area?: string; tipo?: string };

export default async function NotasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const fArea = AREAS_NOTA.includes((sp.area ?? "") as never) ? sp.area : "";
  const fTipo = TIPOS_NOTA.includes((sp.tipo ?? "") as never) ? sp.tipo : "";

  const where = {
    ...(fArea ? { area: fArea } : {}),
    ...(fTipo ? { tipo: fTipo } : {}),
  };
  const notas = await prisma.nota.findMany({
    where,
    orderBy: [{ estado: "asc" }, { prioridad: "asc" }, { createdAt: "desc" }],
  });

  const abiertas = notas.filter((n) => n.estado !== "hecha");
  const hechas = notas.filter((n) => n.estado === "hecha");

  const qs = (patch: Partial<SP>) => {
    const merged = { area: fArea, tipo: fTipo, ...patch };
    const params = new URLSearchParams();
    if (merged.area) params.set("area", merged.area);
    if (merged.tipo) params.set("tipo", merged.tipo);
    const s = params.toString();
    return s ? `/admin/notas?${s}` : "/admin/notas";
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-slate-900">📝 Notas del equipo</h1>
          <p className="text-sm text-slate-500">Tareas, observaciones y recordatorios que deja el equipo desde cada app (botón 📝). Alimentan el <Link href="/admin/supercerebro" className="font-semibold text-amber-600 hover:underline">🧠 Supercerebro</Link>.</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="mt-4 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <FiltroChip href={qs({ tipo: "" })} activo={!fTipo} label="Todos los tipos" />
          {TIPOS_NOTA.map((t) => (
            <FiltroChip key={t} href={qs({ tipo: fTipo === t ? "" : t })} activo={fTipo === t} label={`${tipoNotaIcono[t]} ${tipoNotaLabel[t]}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <FiltroChip href={qs({ area: "" })} activo={!fArea} label="Todas las áreas" />
          {AREAS_NOTA.map((a) => (
            <FiltroChip key={a} href={qs({ area: fArea === a ? "" : a })} activo={fArea === a} label={`${areaNotaIcono[a]} ${areaNotaLabel[a]}`} />
          ))}
        </div>
      </div>

      <Seccion titulo="🟡 Abiertas" items={abiertas} vacia="No hay notas abiertas con este filtro." />
      <Seccion titulo="✅ Resueltas" items={hechas} vacia="Aún no hay notas resueltas." tachado />
    </div>
  );
}

function FiltroChip({ href, activo, label }: { href: string; activo: boolean; label: string }) {
  return (
    <Link href={href} className={`rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${activo ? "border-amber-400 bg-amber-100 text-amber-800" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>
      {label}
    </Link>
  );
}

type N = {
  id: string; texto: string; tipo: string; area: string; autor: string | null;
  prioridad: string; estado: string; createdAt: Date; hechaEn: Date | null;
};

function Seccion({ titulo, items, vacia, tachado }: { titulo: string; items: N[]; vacia: string; tachado?: boolean }) {
  return (
    <div className="mt-6">
      <h2 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">{titulo} <span className="text-slate-400">({items.length})</span></h2>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">{vacia}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <form action={toggleNota}>
                <input type="hidden" name="id" value={n.id} />
                <button title={n.estado === "hecha" ? "Reabrir" : "Marcar resuelta"} className="mt-0.5 text-lg leading-none">
                  {n.estado === "hecha" ? "✅" : "⭕"}
                </button>
              </form>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold text-slate-900 ${tachado ? "line-through opacity-60" : ""}`}>
                  <span className="mr-1">{tipoNotaIcono[n.tipo]}</span>{n.texto}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">{areaNotaIcono[n.area]} {areaNotaLabel[n.area]}</span>
                  {n.estado !== "hecha" && <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${prioridadColor[n.prioridad] ?? ""}`}>{prioridadLabel[n.prioridad]}</span>}
                  <span className="text-[11px] text-slate-400">🕒 {fmt(n.createdAt)}</span>
                  {n.autor && <span className="text-[11px] text-slate-400">· {n.autor}</span>}
                  {n.hechaEn && <span className="text-[11px] text-emerald-600">✓ {fmt(n.hechaEn)}</span>}
                </div>
              </div>
              <form action={eliminarNota}><input type="hidden" name="id" value={n.id} /><button className="text-xs text-slate-400 hover:text-red-500">✕</button></form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
