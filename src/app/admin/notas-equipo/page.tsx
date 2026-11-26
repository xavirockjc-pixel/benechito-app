import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const AREA_INFO: Record<string, { label: string; color: string }> = {
  bodega: { label: "Bodega", color: "#b45309" },
  caja: { label: "Caja", color: "#0f7a44" },
  vendedor: { label: "Vendedor", color: "#1479c4" },
  produccion: { label: "Producción", color: "#0d9488" },
  jefatura: { label: "Jefatura", color: "#7c3aed" },
};
const fmt = (d: Date) => new Date(d).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" });

/** Central: el dueño ve (solo lectura) las notas personales de cada trabajador. */
export default async function NotasEquipoPage({ searchParams }: { searchParams: Promise<{ q?: string; area?: string }> }) {
  const { q, area } = await searchParams;

  const notas = await prisma.notaPersonal.findMany({
    where: { ...(area && AREA_INFO[area] ? { area } : {}) },
    orderBy: { fecha: "desc" }, take: 1500,
  });
  const qn = norm((q ?? "").trim());
  const filtradas = qn ? notas.filter((n) => norm(n.texto).includes(qn) || norm(n.asunto ?? "").includes(qn)) : notas;

  // Nombres de los trabajadores.
  const ids = [...new Set(filtradas.map((n) => n.usuarioId))];
  const usuarios = ids.length ? await prisma.usuario.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } }) : [];
  const nombreDe = new Map(usuarios.map((u) => [u.id, u.nombre]));

  // Agrupa por trabajador.
  const porTrab = new Map<string, typeof filtradas>();
  for (const n of filtradas) { if (!porTrab.has(n.usuarioId)) porTrab.set(n.usuarioId, []); porTrab.get(n.usuarioId)!.push(n); }

  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, area, ...patch })) if (v) p.set(k, v);
    return `/admin/notas-equipo?${p.toString()}`;
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <Link href="/admin" className="text-sm font-semibold text-[#1479c4]">← Panel</Link>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">📔 Notas del equipo</h1>
        <p className="text-sm text-slate-500">Las notas internas de cada trabajador (solo lectura).</p>
      </div>

      {/* Filtros */}
      <form className="flex gap-2">
        {area && <input type="hidden" name="area" value={area} />}
        <input name="q" defaultValue={q ?? ""} placeholder="🔎 Buscar por palabra o asunto…" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm" />
        <button className="rounded-xl bg-[#1479c4] px-4 text-sm font-bold text-white">Buscar</button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        <Link href={qs({ area: undefined })} className={`rounded-full border px-3 py-1 text-xs font-bold ${!area ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-500"}`}>Todas</Link>
        {Object.entries(AREA_INFO).map(([k, v]) => (
          <Link key={k} href={qs({ area: area === k ? undefined : k })} className={`rounded-full border px-3 py-1 text-xs font-bold ${area === k ? "text-white" : "border-slate-200 bg-white text-slate-500"}`}
            style={area === k ? { background: v.color, borderColor: v.color } : undefined}>{v.label}</Link>
        ))}
      </div>

      {porTrab.size === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Sin notas {q || area ? "para ese filtro" : "aún"}.</p>
      ) : (
        <div className="space-y-4">
          {[...porTrab.entries()].map(([uid, lista]) => (
            <section key={uid}>
              <h2 className="mb-2 text-sm font-extrabold text-slate-700">👤 {nombreDe.get(uid) ?? "Trabajador"} <span className="font-normal text-slate-400">({lista.length})</span></h2>
              <div className="space-y-2">
                {lista.slice(0, 50).map((n) => {
                  const a = AREA_INFO[n.area] ?? { label: n.area, color: "#64748b" };
                  return (
                    <div key={n.id} className="rounded-2xl border border-slate-200 p-3 shadow-sm" style={{ background: n.color ?? "#f8fafc" }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {n.asunto && <p className="font-extrabold text-slate-900">{n.asunto}</p>}
                          <p className="whitespace-pre-wrap text-sm text-slate-700">{n.texto}</p>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: a.color }}>{a.label}</span>
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">📅 {fmt(n.fecha)}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
