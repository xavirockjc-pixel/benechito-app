import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseCampos, parseRespuestas, categoriaFormLabel, rolFormLabel } from "@/lib/dominio/checklists";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";
const fmt = (d: Date) => new Date(d).toLocaleString("es-CL", { dateStyle: "long", timeStyle: "short" });

function mostrar(v: string): string {
  if (v === "si") return "Sí";
  if (v === "no") return "No";
  return v && v.trim() ? v : "—";
}

export default async function RespuestaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = await prisma.formularioRespuesta.findUnique({ where: { id }, include: { formulario: true } });
  if (!r) notFound();

  const campos = parseCampos(r.formulario.campos);
  const resp = parseRespuestas(r.respuestas);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/formularios/respuestas" className="text-sm font-semibold text-[#1479c4]">← Historial</Link>
        <PrintButton />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="font-display text-xl font-extrabold text-slate-900">{r.formulario.nombre}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {categoriaFormLabel[r.formulario.categoria] ?? r.formulario.categoria} · {rolFormLabel[r.formulario.rol] ?? r.formulario.rol}
        </p>
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          <p><b className="text-slate-800">Completado por:</b> {r.usuarioNombre ?? "—"}</p>
          <p><b className="text-slate-800">Fecha:</b> {fmt(r.fecha)}</p>
        </div>

        <div className="mt-5 divide-y divide-slate-100">
          {campos.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-4 py-2.5">
              <span className="text-sm font-semibold text-slate-700">{c.label}</span>
              <span className="text-right text-sm font-bold text-slate-900">{mostrar(resp[c.id] ?? "")}</span>
            </div>
          ))}
        </div>

        {r.notas && (
          <div className="mt-4 rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Notas</p>
            <p className="mt-1 text-sm text-slate-700">{r.notas}</p>
          </div>
        )}

        <p className="mt-6 border-t border-slate-200 pt-3 text-center text-xs text-slate-400">Benechito · Registro de control · generado el {fmt(new Date())}</p>
      </div>
    </div>
  );
}
