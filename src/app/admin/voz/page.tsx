import { prisma } from "@/lib/prisma";
import ConsolaVoz from "./ConsolaVoz";
import type { ItemCat } from "@/lib/dominio/comandos";

export const dynamic = "force-dynamic";

export default async function VozPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;

  const [productos, sabores] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }], select: { id: true, nombre: true, linea: true } }),
  ]);

  const catalogo: ItemCat[] = [
    ...productos.map((p) => ({ clase: "producto" as const, id: p.id, nombre: p.nombre })),
    ...sabores.map((s) => ({ clase: "sabor" as const, id: s.id, nombre: s.nombre, linea: s.linea })),
  ];

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🎙️ Asistente de voz</h1>
      <p className="text-sm text-slate-500">Dicta un comando y confírmalo antes de que entre al panel.</p>

      {ok && <p className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ {ok}</p>}

      <div className="mt-5">
        <ConsolaVoz catalogo={catalogo} />
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        <p className="mb-2 font-bold text-slate-900">Comandos que entiende hoy</p>
        <ul className="space-y-1">
          <li>🏭 <span className="font-mono text-xs">“orden de producción cien frutilla”</span> → crea la orden</li>
          <li>🏭 <span className="font-mono text-xs">“produce cincuenta paletas de leche”</span></li>
          <li>📅 <span className="font-mono text-xs">“agenda fabricar doscientos trufas para el viernes”</span></li>
          <li>📅 <span className="font-mono text-xs">“agenda entrega dos surtido mañana”</span></li>
          <li>📅 <span className="font-mono text-xs">“apartar cinco postres el 25”</span></li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Es la versión de comandos (gratis). Cuando quieras el asistente que entiende lenguaje libre (“todo en general”), pasamos al de IA.
        </p>
      </div>
    </div>
  );
}
