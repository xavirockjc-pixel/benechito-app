import { prisma } from "@/lib/prisma";
import ConsolaVoz from "./ConsolaVoz";
import type { ItemCat } from "@/lib/dominio/comandos";

export const dynamic = "force-dynamic";

export default async function VozPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;

  const [productos, sabores, trabajadores, clientes] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.sabor.findMany({ where: { activo: true }, orderBy: [{ linea: "asc" }, { nombre: "asc" }], select: { id: true, nombre: true, linea: true } }),
    prisma.trabajador.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
    prisma.negocio.findMany({ where: { nombreNegocio: { not: "Consumidor Final" } }, orderBy: { nombreNegocio: "asc" }, select: { id: true, nombreNegocio: true } }),
  ]);

  const catalogo: ItemCat[] = [
    ...productos.map((p) => ({ clase: "producto" as const, id: p.id, nombre: p.nombre })),
    ...sabores.map((s) => ({ clase: "sabor" as const, id: s.id, nombre: s.nombre, linea: s.linea })),
  ];
  const personasTrab = trabajadores.map((t) => ({ id: t.id, nombre: t.nombre }));
  const personasCli = clientes.map((c) => ({ id: c.id, nombre: c.nombreNegocio }));

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-extrabold text-slate-900">🎙️ Asistente de voz</h1>
      <p className="text-sm text-slate-500">Dicta un comando y confírmalo antes de que entre al panel.</p>

      {ok && <p className="mt-4 rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ {ok}</p>}

      <div className="mt-5">
        <ConsolaVoz catalogo={catalogo} trabajadores={personasTrab} clientes={personasCli} />
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
        <p className="mt-3 mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">Finanzas (dinero)</p>
        <ul className="space-y-1">
          <li>💸 <span className="font-mono text-xs">“registra un gasto de 5 mil en bencina”</span></li>
          <li>👥 <span className="font-mono text-xs">“págale 20 mil a Isaías”</span> → pago al equipo</li>
          <li>💰 <span className="font-mono text-xs">“abona 10 mil a Don José”</span> → cobro a cliente</li>
          <li>💳 <span className="font-mono text-xs">“anota una deuda de 50 mil al proveedor”</span></li>
        </ul>
        <p className="mt-3 text-xs text-slate-400">
          Cada acción te la muestra para <b>confirmar</b> antes de guardar. Para hablar 100% libre (cualquier forma de decirlo) se necesita el asistente con IA.
        </p>
      </div>
    </div>
  );
}
