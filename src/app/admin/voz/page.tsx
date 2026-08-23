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
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Ir a cualquier módulo</p>
        <ul className="mb-3 space-y-1">
          <li>➡️ <span className="font-mono text-xs">“abre precios”</span>, <span className="font-mono text-xs">“ve a inventario”</span>, <span className="font-mono text-xs">“muéstrame finanzas”</span></li>
          <li>➡️ Clientes, catálogo, pedidos, preventa, rutas, ventas, reposiciones, sabores, agenda, producción…</li>
        </ul>
        <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Crear</p>
        <ul className="space-y-1">
          <li>🏭 <span className="font-mono text-xs">“orden de producción cien frutilla”</span> → crea la orden</li>
          <li>📅 <span className="font-mono text-xs">“agenda fabricar doscientos trufas para el viernes”</span></li>
          <li>📅 <span className="font-mono text-xs">“apartar cinco postres el 25”</span></li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Con voz llegas a <b>todos</b> los módulos. Para <b>modificar todo</b> hablando libre (cambiar precios, editar finanzas, etc.) se necesita el asistente con IA.
        </p>
      </div>
    </div>
  );
}
