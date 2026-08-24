import { prisma } from "@/lib/prisma";
import MateriaPickerOperario from "@/app/_shared/MateriaPickerOperario";
import InsumoVoz from "@/app/_shared/InsumoVoz";
import { ingresarMateriaOperario, sacarMateriaOperario, crearMateriaOperario } from "@/app/_shared/materias-operario";
import { fmtCant, categoriaLabel, categoriaIcono, tipoMovMateriaLabel, stockBajo } from "@/lib/dominio/materias";

export const dynamic = "force-dynamic";

const fmtFecha = (d: Date) =>
  new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function BodegaInsumos() {
  const [materiales, movs] = await Promise.all([
    prisma.materiaPrima.findMany({
      where: { activo: true },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
      select: { id: true, nombre: true, unidad: true, categoria: true, stock: true, stockMinimo: true },
    }),
    // Registro reciente: entradas Y salidas/consumos (lo que se ha sacado). Sin costos.
    prisma.movimientoMateria.findMany({
      orderBy: { fecha: "desc" },
      take: 60,
      include: { materiaPrima: { select: { nombre: true, unidad: true } } },
    }),
  ]);

  const pick = materiales.map((m) => ({ id: m.id, nombre: m.nombre, unidad: m.unidad, categoria: m.categoria }));
  const porCat = (c: string) => materiales.filter((m) => m.categoria === c);
  const bajos = materiales.filter((m) => stockBajo(m.stock, m.stockMinimo));

  return (
    <div>
      <h1 className="text-xl font-extrabold text-slate-900">🧪 Insumos de bodega</h1>
      <p className="text-sm text-slate-500">Registra lo que llega y lo que sale. Aquí ves lo que queda en existencia.</p>

      {bajos.length > 0 && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          ⚠️ <b>Por acabarse:</b> {bajos.map((m) => `${m.nombre} (${fmtCant(m.stock, m.unidad)})`).join(", ")}.
        </div>
      )}

      {/* Por voz: ingresar o crear */}
      <div className="mt-4">
        <InsumoVoz materiales={pick} color="#b45309" />
        <p className="mt-1 text-center text-[11px] text-slate-400">Ej: “ingresa 5 kilos de chocolate” · si es nuevo, te deja crearlo.</p>
      </div>

      {/* Ingresar (manual) */}
      <details open className="mt-4">
        <summary className="cursor-pointer text-sm font-bold text-[#b45309]">➕ Ingresar insumo</summary>
        <div className="mt-2">
          <MateriaPickerOperario materiales={pick} accion={ingresarMateriaOperario} etiqueta="➕ Ingresar" color="#b45309" />
        </div>
      </details>

      {/* Crear insumo (manual) */}
      <details className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-bold text-slate-700">🆕 Crear insumo nuevo</summary>
        <form action={crearMateriaOperario} className="mt-3 grid grid-cols-2 gap-2">
          <input name="nombre" required placeholder="Nombre (ej: Azúcar flor)" className="col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          <label className="text-xs font-semibold text-slate-500">Tipo
            <select name="categoria" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="insumo">Materia prima</option>
              <option value="material">Material / envase</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-500">Unidad
            <select name="unidad" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="kg">kg</option><option value="g">g</option><option value="l">L</option><option value="ml">ml</option><option value="unidad">u.</option>
            </select>
          </label>
          <label className="col-span-2 text-xs font-semibold text-slate-500">Cantidad inicial (opcional)
            <input name="stockInicial" inputMode="decimal" placeholder="0" className="mt-0.5 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>
          <button className="col-span-2 rounded-lg bg-[#b45309] py-2.5 text-sm font-extrabold text-white active:brightness-110">Crear insumo</button>
        </form>
      </details>

      {/* Sacar */}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-bold text-slate-700">➖ Sacar insumo (entregar a producción / traslado)</summary>
        <div className="mt-2">
          <MateriaPickerOperario materiales={pick} accion={sacarMateriaOperario} etiqueta="➖ Sacar" color="#64748b" />
        </div>
      </details>

      {/* Lo que queda (existencias, sin costos) */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-400">Lo que queda en bodega</h2>
      {materiales.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          Aún no hay insumos. La central los crea primero.
        </p>
      ) : (
        <div className="space-y-4">
          {(["insumo", "material"] as const).map((cat) => {
            const lista = porCat(cat);
            if (lista.length === 0) return null;
            return (
              <div key={cat}>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {categoriaIcono[cat]} {categoriaLabel[cat]}
                </p>
                <div className="space-y-1">
                  {lista.map((m) => {
                    const bajo = stockBajo(m.stock, m.stockMinimo);
                    return (
                      <div key={m.id} className={`flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm shadow-sm ${bajo ? "border-red-300" : "border-slate-200"}`}>
                        <span className="min-w-0 truncate text-slate-800">{m.nombre}</span>
                        <span className={`ml-2 shrink-0 font-extrabold ${bajo ? "text-red-600" : "text-slate-900"}`}>
                          {fmtCant(m.stock, m.unidad)}{bajo && <span className="ml-1 rounded bg-red-100 px-1 py-0.5 text-[10px] font-bold text-red-700">bajo</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registro de movimientos */}
      <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-400">Registro de movimientos ({movs.length})</h2>
      {movs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">Sin movimientos aún.</p>
      ) : (
        <ul className="space-y-1">
          {movs.map((m) => {
            const entra = m.tipo === "entrada" || (m.tipo === "ajuste" && m.cantidad >= 0);
            return (
              <li key={m.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                <span className="min-w-0 truncate">
                  <span className={`font-bold ${entra ? "text-green-600" : "text-amber-600"}`}>
                    {entra ? "+" : "−"}{fmtCant(Math.abs(m.cantidad), m.materiaPrima.unidad)}
                  </span>{" "}
                  <span className="text-slate-800">{m.materiaPrima.nombre}</span>{" "}
                  <span className="text-xs text-slate-400">· {tipoMovMateriaLabel[m.tipo] ?? m.tipo}</span>
                </span>
                <span className="shrink-0 text-xs text-slate-400">{m.nombreUsuario ? `${m.nombreUsuario} · ` : ""}{fmtFecha(m.fecha)}</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-[11px] leading-tight text-slate-400">
        Ves cantidades y movimientos. Los costos y el valor en dinero se ven solo en la central.
      </p>
    </div>
  );
}
