import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { usuarioActual } from "@/lib/auth";
import { crearNotaPersonal, eliminarNotaPersonal } from "../actions";

export const dynamic = "force-dynamic";

const COLORES = ["#fef9c3", "#dcfce7", "#dbeafe", "#fce7f3", "#ede9fe", "#ffedd5"];
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const isoDe = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];
const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export default async function NotasPersonalesBodega({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; m?: string }> }) {
  const { q, f, m } = await searchParams;
  const u = await usuarioActual();
  if (!u?.sub) {
    return <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Inicia sesión para ver tus notas.</p>;
  }

  const notas = await prisma.notaPersonal.findMany({
    where: { usuarioId: u.sub, area: "bodega" },
    orderBy: { fecha: "desc" }, take: 1000,
  });

  // Mapa día → notas (para el calendario).
  const porDia = new Map<string, number>();
  for (const n of notas) porDia.set(isoDe(new Date(n.fecha)), (porDia.get(isoDe(new Date(n.fecha))) ?? 0) + 1);

  // Mes del calendario.
  const hoy = new Date();
  const [my, mm] = (m && /^\d{4}-\d{2}$/.test(m) ? m : `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`).split("-").map(Number);
  const primero = new Date(my, mm - 1, 1);
  const diasEnMes = new Date(my, mm, 0).getDate();
  const offset = (primero.getDay() + 6) % 7; // lunes primero
  const mesIso = `${my}-${String(mm).padStart(2, "0")}`;
  const prevMes = new Date(my, mm - 2, 1), nextMes = new Date(my, mm, 1);
  const mesParam = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  // Filtro de la lista: por palabra (asunto/texto) y/o por día.
  const qn = norm((q ?? "").trim());
  const lista = notas.filter((n) => {
    if (f && isoDe(new Date(n.fecha)) !== f) return false;
    if (qn && !(norm(n.texto).includes(qn) || norm(n.asunto ?? "").includes(qn))) return false;
    return true;
  });

  const qs = (patch: Record<string, string | undefined>) => {
    const base: Record<string, string | undefined> = { q, f, m: mesIso, ...patch };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    return `/bodega/notas?${p.toString()}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/bodega" className="text-sm font-semibold text-[#b45309]">← Bodega</Link>
          <h1 className="mt-1 text-xl font-extrabold text-slate-900">📔 Mis notas</h1>
          <p className="text-xs text-slate-500">Tus recordatorios, solo para ti. Con calendario y buscador.</p>
        </div>
      </div>

      {/* Nueva nota */}
      <form action={crearNotaPersonal} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input name="asunto" placeholder="Asunto (ej: pedir cajas)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold" />
        <textarea name="texto" required rows={2} placeholder="Escribe tu nota…" className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="date" name="fecha" defaultValue={isoDe(hoy)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
          <div className="flex items-center gap-1">
            {COLORES.map((c, i) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="color" value={c} defaultChecked={i === 0} className="peer sr-only" />
                <span className="block h-7 w-7 rounded-full ring-2 ring-transparent peer-checked:ring-slate-500" style={{ background: c }} />
              </label>
            ))}
          </div>
          <button className="ml-auto rounded-lg bg-[#b45309] px-4 py-2 text-sm font-extrabold text-white active:brightness-95">Guardar nota</button>
        </div>
      </form>

      {/* Buscador */}
      <form className="flex gap-2">
        {f && <input type="hidden" name="f" value={f} />}
        <input type="hidden" name="m" value={mesIso} />
        <input name="q" defaultValue={q ?? ""} placeholder="🔎 Buscar por palabra o asunto…" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm" />
        <button className="rounded-xl bg-[#b45309] px-4 text-sm font-bold text-white">Buscar</button>
        {(q || f) && <Link href="/bodega/notas" className="grid place-items-center rounded-xl bg-slate-100 px-3 text-sm font-bold text-slate-500">✕</Link>}
      </form>

      {/* Calendario del mes */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <Link href={qs({ m: mesParam(prevMes), f: undefined })} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">←</Link>
          <span className="text-sm font-extrabold text-slate-800">{MESES[mm - 1]} {my}</span>
          <Link href={qs({ m: mesParam(nextMes), f: undefined })} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600">→</Link>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DIAS.map((d, i) => <span key={i} className="text-[10px] font-bold uppercase text-slate-400">{d}</span>)}
          {Array.from({ length: offset }).map((_, i) => <span key={`e${i}`} />)}
          {Array.from({ length: diasEnMes }).map((_, i) => {
            const dia = i + 1;
            const iso = `${mesIso}-${String(dia).padStart(2, "0")}`;
            const n = porDia.get(iso) ?? 0;
            const activo = f === iso;
            return (
              <Link key={dia} href={f === iso ? qs({ f: undefined }) : qs({ f: iso })}
                className={`relative grid aspect-square place-items-center rounded-lg text-sm font-semibold ${activo ? "bg-[#b45309] text-white" : n > 0 ? "bg-amber-100 text-amber-800" : "text-slate-600 hover:bg-slate-50"}`}>
                {dia}
                {n > 0 && !activo && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-amber-500" />}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Lista (filtrada) */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
          {f ? `📅 ${f}` : q ? "Resultados" : "Todas"} <span className="text-slate-300">({lista.length})</span>
        </p>
        {lista.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Sin notas {f || q ? "para ese filtro" : "todavía"}.</p>
        ) : (
          lista.map((n) => (
            <div key={n.id} className="rounded-2xl border border-slate-200 p-3 shadow-sm" style={{ background: n.color ?? "#f8fafc" }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {n.asunto && <p className="font-extrabold text-slate-900">{n.asunto}</p>}
                  <p className="whitespace-pre-wrap text-sm text-slate-700">{n.texto}</p>
                </div>
                <form action={eliminarNotaPersonal}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="shrink-0 text-xs font-bold text-slate-400 hover:text-red-500" aria-label="Borrar">✕</button>
                </form>
              </div>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">📅 {new Date(n.fecha).toLocaleDateString("es-CL", { weekday: "short", day: "2-digit", month: "short" })}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
