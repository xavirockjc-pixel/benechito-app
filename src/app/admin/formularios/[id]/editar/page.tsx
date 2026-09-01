import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseCampos } from "@/lib/dominio/checklists";
import FormularioEditor from "../../FormularioEditor";
import { actualizarFormulario } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditarFormularioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const f = await prisma.formulario.findUnique({ where: { id } });
  if (!f) notFound();

  return (
    <div>
      <Link href="/admin/formularios" className="text-sm font-semibold text-[#1479c4]">← Checklists</Link>
      <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900">Editar plantilla</h1>
      <p className="mb-4 text-sm text-slate-500">Los cambios se aplican a todas las apps del rol.</p>
      <FormularioEditor
        accion={actualizarFormulario}
        inicial={{ id: f.id, nombre: f.nombre, categoria: f.categoria, rol: f.rol, frecuencia: f.frecuencia, campos: parseCampos(f.campos) }}
      />
    </div>
  );
}
