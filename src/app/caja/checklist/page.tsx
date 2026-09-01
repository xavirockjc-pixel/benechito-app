import ChecklistSeccion from "@/components/ChecklistSeccion";
import MicDictado from "@/components/MicDictado";

export const dynamic = "force-dynamic";

export default async function ChecklistPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;
  return (
    <div>
      <h1 className="font-display text-xl font-extrabold text-slate-900">🧼 Higiene y seguridad</h1>
      <p className="mb-3 text-sm text-slate-500">Completa los checklist del día. Queda registrado con tu nombre y la hora.</p>
      <div className="mb-3"><MicDictado etiqueta="🎤 Dictar (toca un campo y habla)" /></div>
      {ok && (
        <p className="mb-3 rounded-xl border border-green-300 bg-green-50 px-3 py-2 text-sm font-bold text-green-700">✓ Checklist guardado. ¡Gracias!</p>
      )}
      <ChecklistSeccion rol="caja" volver="/caja/checklist" />
    </div>
  );
}
