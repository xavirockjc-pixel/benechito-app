import { prisma } from "@/lib/prisma";
import { confirmarSalidaVenta, marcarSalidaInterna, descartarSalida } from "./actions";

export const dynamic = "force-dynamic";

const fmtFH = (d: Date) => new Date(d).toLocaleString("es-CL", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default async function SalidasPendientes() {
  const [pendientes, negocios] = await Promise.all([
    prisma.salidaBodega.findMany({ where: { estado: "pendiente" }, orderBy: { fecha: "desc" }, take: 100 }),
    prisma.negocio.findMany({ select: { nombreNegocio: true, nombreContacto: true }, take: 400 }),
  ]);
  const clientes = [...new Set(negocios.map((n) => n.nombreNegocio || n.nombreContacto).filter((x): x is string => !!x))].sort();

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold text-slate-900">🚚 Salidas por confirmar</h1>
      <p className="text-sm text-slate-500">
        Lo que salió de bodega hacia un cliente/destino. Confirma a dónde fue: si se vendió, se crea la venta
        y el cerebro empieza a analizar cuánto compra ese cliente/canal.
      </p>

      <datalist id="clientes-conf">{clientes.map((c) => <option key={c} value={c} />)}</datalist>

      {pendientes.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
          No hay salidas por confirmar. 🎉
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {pendientes.map((s) => (
            <section key={s.id} className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{s.cantidad} × {s.nombre}</p>
                  <p className="text-[11px] text-slate-400">
                    {s.destinoTexto ? `Para: ${s.destinoTexto} · ` : ""}{fmtFH(s.fecha)}{s.nombreUsuario ? ` · ${s.nombreUsuario}` : ""}
                  </p>
                </div>
              </div>

              {/* Se vendió → crea venta */}
              <form action={confirmarSalidaVenta} className="mt-3 rounded-xl bg-green-50 p-3">
                <input type="hidden" name="id" value={s.id} />
                <p className="mb-2 text-xs font-extrabold text-green-800">✅ Se vendió</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <input name="cliente" list="clientes-conf" defaultValue={s.destinoTexto ?? ""} placeholder="Cliente"
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  <span className="flex items-center rounded-lg border border-slate-300 bg-white px-2">
                    <span className="text-slate-400">$</span>
                    <input name="total" inputMode="numeric" placeholder="Monto total" className="w-full px-1 py-2 text-right text-sm font-semibold outline-none" />
                  </span>
                  <select name="canal" defaultValue="terreno" className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
                    <option value="terreno">Ruta / terreno</option>
                    <option value="local">Local</option>
                    <option value="directa">Directa</option>
                  </select>
                </div>
                <button className="mt-2 w-full rounded-lg bg-green-600 py-2 text-sm font-bold text-white active:brightness-95">Confirmar venta</button>
              </form>

              {/* Otras salidas */}
              <div className="mt-2 flex gap-2">
                <form action={marcarSalidaInterna} className="flex-1">
                  <input type="hidden" name="id" value={s.id} />
                  <button className="w-full rounded-lg border border-slate-300 py-2 text-xs font-bold text-slate-600 active:bg-slate-50">Uso interno / merma</button>
                </form>
                <form action={descartarSalida} className="flex-1">
                  <input type="hidden" name="id" value={s.id} />
                  <button className="w-full rounded-lg border border-slate-300 py-2 text-xs font-bold text-slate-500 active:bg-slate-50">Descartar</button>
                </form>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
