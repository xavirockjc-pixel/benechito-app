import Link from "next/link";
import FormularioEditor from "../FormularioEditor";
import { crearFormulario } from "../actions";

export default function NuevoFormularioPage() {
  return (
    <div>
      <Link href="/admin/formularios" className="text-sm font-semibold text-[#1479c4]">← Checklists</Link>
      <h1 className="mt-1 font-display text-2xl font-extrabold text-slate-900">Nueva plantilla</h1>
      <p className="mb-4 text-sm text-slate-500">Define los campos; se mostrará en la app del rol que elijas.</p>
      <FormularioEditor accion={crearFormulario} />
    </div>
  );
}
