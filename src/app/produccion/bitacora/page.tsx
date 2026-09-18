import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { tipoNotaIcono, tipoNotaLabel } from "@/lib/dominio/notas";
import { crearNotaProduccion, toggleNotaProduccion } from "../actions";
import BitacoraForm from "./BitacoraForm";
import MicDictado from "@/components/MicDictado";

export const dynamic = "force-dynamic";

const fmt = (d: Date) => new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function BitacoraPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  const notas = await prisma.nota.findMany({
    where: { area: "produccion" },
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
    take: 40,
  });
  const abiertas = notas.filter((n) => n.estado !== "hecha");
  const hechas = notas.filter((n) => n.estado === "hecha");

  return (
    <div>
      <Link href="/produccion" className="text-sm font-semibold text-[#0f766e]">← Producción</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">📓 Bitácora y mejoras</h1>
      <p className="text-xs text-slate-500">Anota lo que falta, lo que se acaba o cualquier mejora. La central lo ve en el panel.</p>

      {ok && <p className="mt-3 rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Guardado en la bitácora</p>}

      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-teal-50 px-3 py-2">
        <span className="text-xs font-semibold text-[#0f766e]">🎤 Toca el recuadro y dicta por voz</span>
        <MicDictado etiqueta="🎤" />
      </div>

      <div className="mt-3">
        <BitacoraForm action={crearNotaProduccion} />
      </div>

      {/* Pendientes */}
      <h2 className="mt-6 mb-2 text-sm font-extrabold text-slate-900">🕐 Pendientes {abiertas.length > 0 && <span className="text-slate-400">({abiertas.length})</span>}</h2>
      {abiertas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">Sin pendientes. ¡Buen turno!</p>
      ) : (
        <ul className="space-y-2">
          {abiertas.map((n) => (
            <li key={n.id} className={`rounded-xl border bg-white p-3 shadow-sm ${n.prioridad === "alta" ? "border-red-200" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{tipoNotaIcono[n.tipo] ?? "📝"} {n.texto}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {tipoNotaLabel[n.tipo] ?? n.tipo}{n.prioridad === "alta" ? " · prioridad alta" : ""} · {n.autor ?? "Producción"} · {fmt(n.createdAt)}
                  </p>
                </div>
                <form action={toggleNotaProduccion} className="shrink-0">
                  <input type="hidden" name="id" value={n.id} />
                  <button className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-700 active:bg-teal-100">Listo ✓</button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Resueltas (colapsable) */}
      {hechas.length > 0 && (
        <details className="mt-5 rounded-xl border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-sm font-bold text-slate-600">✓ Resueltas ({hechas.length})</summary>
          <ul className="mt-2 space-y-1">
            {hechas.map((n) => (
              <li key={n.id} className="flex items-center justify-between gap-2 py-1 text-sm">
                <span className="min-w-0 truncate text-slate-400 line-through">{n.texto}</span>
                <form action={toggleNotaProduccion} className="shrink-0">
                  <input type="hidden" name="id" value={n.id} />
                  <button className="text-[11px] font-semibold text-slate-400">reabrir</button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
