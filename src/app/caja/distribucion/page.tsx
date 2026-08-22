import Link from "next/link";
import { prisma } from "@/lib/prisma";
import MovimientoBodegaVoz from "../../bodega/MovimientoBodegaVoz";
import { crearProductoDistribucion } from "../../bodega/actions";

export const dynamic = "force-dynamic";

const fmtHora = (d: Date) => new Date(d).toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
const inputCls = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-800 outline-none focus:border-[#0f7a44]";

export default async function DistribucionPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const { ok } = await searchParams;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [reventa, registroHoy] = await Promise.all([
    prisma.producto.findMany({ where: { activo: true, tipo: "reventa" }, orderBy: [{ categoria: "asc" }, { nombre: "asc" }] }),
    prisma.movimientoBodega.findMany({ where: { fecha: { gte: hoy }, zona: "sala" }, orderBy: { fecha: "desc" }, take: 100 }),
  ]);

  const catalogo = reventa.map((p) => ({ id: `prod:${p.id}`, nombre: p.nombre }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">📦 Distribución del local</h1>
          <p className="text-xs text-slate-500">Recibe bebidas, snacks y productos de distribución.</p>
        </div>
        <Link href="/caja" className="text-sm font-semibold text-[#0f7a44]">← Caja</Link>
      </div>

      {ok && (
        <p className="rounded-xl bg-green-100 px-4 py-3 text-center text-sm font-bold text-green-700">✓ Registrado</p>
      )}

      {/* Nuevo producto de distribución (tipo + sabor) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-extrabold text-slate-900">➕ Nuevo producto de distribución</h2>
        <form action={crearProductoDistribucion} className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-slate-600">Tipo
              <input name="tipoProducto" placeholder="Bebida, Snack…" className={`mt-1 ${inputCls}`} />
            </label>
            <label className="text-xs font-bold text-slate-600">Sabor / variante
              <input name="saborProducto" placeholder="Coca, Naranja…" className={`mt-1 ${inputCls}`} />
            </label>
            <label className="text-xs font-bold text-slate-600">Formato
              <input name="formato" placeholder="350ml, 1.5L…" className={`mt-1 ${inputCls}`} />
            </label>
            <label className="text-xs font-bold text-slate-600">Cantidad que llega
              <input type="number" name="cantidad" min="0" step="1" defaultValue="0" inputMode="numeric" className={`mt-1 ${inputCls}`} />
            </label>
          </div>
          <button className="w-full rounded-xl bg-[#0f7a44] py-2.5 text-sm font-extrabold text-white active:brightness-95">
            Crear y recibir
          </button>
        </form>
      </section>

      {/* Recibir productos existentes (voz o a mano) */}
      <section className="rounded-2xl border border-green-200 bg-green-50/50 p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-extrabold text-green-800">📥 Recibir distribución</h2>
        {catalogo.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay productos de distribución. Crea uno arriba.</p>
        ) : (
          <MovimientoBodegaVoz
            catalogo={catalogo}
            signo={1}
            zona="sala"
            etiqueta="Recibir por voz"
            hint="Di por ejemplo: “doce coca 350”, “seis fanta”."
            colorBoton="bg-green-600"
            textoConfirmar="Recibir en el local"
          />
        )}
      </section>

      {/* Registro del día — sin totales de stock (privacidad) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-bold text-slate-900">🧾 Registro de hoy</h2>
        {registroHoy.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no registras movimientos hoy.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {registroHoy.map((m) => (
              <li key={m.id} className="flex items-center justify-between py-1.5">
                <span className="min-w-0">
                  <span className={`font-bold ${m.tipo === "entrada" ? "text-green-700" : "text-red-600"}`}>
                    {m.tipo === "entrada" ? "📥 +" : "📤 −"}{m.cantidad}
                  </span>{" "}
                  <span className="text-slate-800">{m.nombre}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {m.nombreUsuario ? `${m.nombreUsuario} · ` : ""}{fmtHora(m.fecha)}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] leading-tight text-slate-400">
          Solo ves lo registrado hoy. El stock total se ve únicamente en el panel.
        </p>
      </section>
    </div>
  );
}
