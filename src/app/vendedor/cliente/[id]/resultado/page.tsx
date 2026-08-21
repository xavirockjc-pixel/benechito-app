import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { registrarResultado } from "../../../actions";

export const dynamic = "force-dynamic";

const inputCls = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#1479c4]";

export default async function ResultadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cliente = await prisma.negocio.findUnique({ where: { id }, select: { nombreNegocio: true } });
  if (!cliente) notFound();

  return (
    <div>
      <Link href={`/vendedor/cliente/${id}`} className="text-sm font-semibold text-[#1479c4]">← {cliente.nombreNegocio}</Link>
      <h1 className="mt-1 text-xl font-extrabold text-slate-900">Resultado de la visita</h1>

      <form action={registrarResultado} className="mt-4 space-y-3">
        <input type="hidden" name="negocioId" value={id} />
        <label className="block text-sm font-bold text-slate-700">¿Qué pasó?
          <select name="resultado" required defaultValue="" className={`mt-1 ${inputCls}`}>
            <option value="">Selecciona…</option>
            <option value="Compró">Compró</option>
            <option value="No compró">No compró</option>
            <option value="No estaba">No estaba</option>
            <option value="Pidió visita después">Pidió visita después</option>
            <option value="Cerrado">Cerrado</option>
          </select>
        </label>
        <label className="block text-sm font-bold text-slate-700">Próxima visita (opcional)
          <input type="date" name="proxima" className={`mt-1 ${inputCls}`} />
        </label>
        <button className="w-full rounded-xl bg-[#1479c4] py-3 text-base font-extrabold text-white shadow active:brightness-95">
          Guardar resultado
        </button>
      </form>
    </div>
  );
}
