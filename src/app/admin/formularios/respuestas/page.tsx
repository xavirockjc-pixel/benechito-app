import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { categoriaFormIcon } from "@/lib/dominio/checklists";

export const dynamic = "force-dynamic";
const fmt = (d: Date) => new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function RespuestasPage() {
  const respuestas = await prisma.formularioRespuesta.findMany({
    orderBy: { fecha: "desc" },
    take: 200,
    include: { formulario: { select: { nombre: true, categoria: true } } },
  });

  return (
    <div>
      <Link href="/admin/formularios" className="text-sm font-semibold text-[#1479c4]">← Checklists</Link>
      <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900">📋 Checklists completados</h1>
      <p className="mb-4 text-sm text-slate-500">Historial con quién lo hizo y cuándo. Abre uno para imprimir o guardar en PDF.</p>

      {respuestas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">Todavía no hay checklists completados.</p>
      ) : (
        <div className="space-y-2">
          {respuestas.map((r) => (
            <Link key={r.id} href={`/admin/formularios/respuestas/${r.id}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <span className="min-w-0">
                <span className="block truncate font-bold text-slate-800">{categoriaFormIcon[r.formulario.categoria] ?? "✅"} {r.formulario.nombre}</span>
                <span className="block text-xs text-slate-500">{r.usuarioNombre ?? "—"} · {fmt(r.fecha)}</span>
              </span>
              <span className="shrink-0 text-sm font-bold text-[#1479c4]">Ver →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
