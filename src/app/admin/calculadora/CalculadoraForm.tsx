"use client";

import { useState } from "react";
import { guardarCalculo } from "./actions";

type Prod = { id: string; nombre: string };
type Insumo = { nombre: string; costo: number; unidad: string };
type Item = { nombre: string; cantidad: number; costoUnit: number };
export type CalcInicial = {
  id?: string; tipo?: string; nombre?: string; productoId?: string | null;
  precioVenta?: number | null; rendimiento?: number | null; costoExtra?: number | null;
  costoCompra?: number | null; metaUnidades?: number | null;
  items?: Item[]; inversion?: number | null; retornoMensual?: number | null; notas?: string | null;
};

const CLP = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

export default function CalculadoraForm({ productos, insumos, inicial }: { productos: Prod[]; insumos: Insumo[]; inicial?: CalcInicial }) {
  const [tipo, setTipo] = useState<"producto" | "proyecto">((inicial?.tipo as "producto" | "proyecto") ?? "producto");
  const [modo, setModo] = useState<"fabricado" | "reventa">(inicial?.costoCompra != null ? "reventa" : "fabricado");
  const [nombre, setNombre] = useState(inicial?.nombre ?? "");
  // producto
  const [productoId, setProductoId] = useState(inicial?.productoId ?? "");
  const [precioVenta, setPrecioVenta] = useState(String(inicial?.precioVenta ?? ""));
  const [rendimiento, setRendimiento] = useState(String(inicial?.rendimiento ?? "1"));
  const [costoExtra, setCostoExtra] = useState(String(inicial?.costoExtra ?? ""));
  const [costoCompra, setCostoCompra] = useState(String(inicial?.costoCompra ?? ""));
  const [metaUnidades, setMetaUnidades] = useState(String(inicial?.metaUnidades ?? ""));
  const [items, setItems] = useState<Item[]>(inicial?.items?.length ? inicial.items : [{ nombre: "", cantidad: 1, costoUnit: 0 }]);
  // proyecto
  const [inversion, setInversion] = useState(String(inicial?.inversion ?? ""));
  const [retornoMensual, setRetornoMensual] = useState(String(inicial?.retornoMensual ?? ""));
  const [notas, setNotas] = useState(inicial?.notas ?? "");

  const n = (s: string) => Number(s.replace(/[^\d.]/g, "")) || 0;

  // Cálculo producto
  const costoReceta = items.reduce((s, it) => s + it.cantidad * it.costoUnit, 0) + n(costoExtra);
  const rend = Math.max(1, Math.floor(n(rendimiento)) || 1);
  const costoUnidad = modo === "reventa" ? n(costoCompra) : costoReceta / rend;
  const pv = n(precioVenta);
  const utilUnidad = pv - costoUnidad;
  const margen = pv > 0 ? (utilUnidad / pv) * 100 : 0;

  // Cálculo proyecto
  const inv = n(inversion), ret = n(retornoMensual);
  const meses = ret > 0 ? inv / ret : 0;
  const anual = ret * 12 - inv;

  const setItem = (i: number, patch: Partial<Item>) => setItems((a) => a.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const addItem = () => setItems((a) => [...a, { nombre: "", cantidad: 1, costoUnit: 0 }]);
  const delItem = (i: number) => setItems((a) => a.filter((_, j) => j !== i));

  return (
    <form action={guardarCalculo} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {inicial?.id && <input type="hidden" name="id" value={inicial.id} />}
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="items" value={JSON.stringify(modo === "reventa" ? [] : items.filter((it) => it.nombre.trim()))} />
      <input type="hidden" name="precioVenta" value={precioVenta} />
      <input type="hidden" name="rendimiento" value={rendimiento} />
      <input type="hidden" name="costoExtra" value={modo === "reventa" ? "" : costoExtra} />
      <input type="hidden" name="costoCompra" value={modo === "reventa" ? costoCompra : ""} />
      <input type="hidden" name="metaUnidades" value={metaUnidades} />
      <input type="hidden" name="inversion" value={inversion} />
      <input type="hidden" name="retornoMensual" value={retornoMensual} />

      {/* Tabs */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setTipo("producto")} className={`rounded-xl py-2.5 text-sm font-extrabold ${tipo === "producto" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500"}`}>🍫 Producto (receta)</button>
        <button type="button" onClick={() => setTipo("proyecto")} className={`rounded-xl py-2.5 text-sm font-extrabold ${tipo === "proyecto" ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-500"}`}>🏗️ Proyecto / inversión</button>
      </div>

      <label className="block text-xs font-bold text-slate-600">Nombre
        <input name="nombre" required value={nombre} onChange={(e) => setNombre(e.target.value)}
          placeholder={tipo === "producto" ? "Ej: Trufa clásica" : "Ej: Comprar enfriador"} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </label>

      {tipo === "producto" ? (
        <div className="mt-4 space-y-3">
          {/* Modo: fabricado (receta) o reventa (compra-venta) */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setModo("fabricado")} className={`rounded-lg border py-2 text-xs font-bold ${modo === "fabricado" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>🏭 Fabricado (receta)</button>
            <button type="button" onClick={() => setModo("reventa")} className={`rounded-lg border py-2 text-xs font-bold ${modo === "reventa" ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-500"}`}>🚚 Reventa (compra→ruta)</button>
          </div>

          {modo === "fabricado" ? (
            <>
              {/* Receta con insumos cargados */}
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Receta — elige el insumo y su costo se llena solo</p>
                <div className="space-y-2">
                  {items.map((it, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select value="" onChange={(e) => { const ins = insumos.find((x) => x.nombre === e.target.value); if (ins) setItem(i, { nombre: ins.nombre, costoUnit: ins.costo }); }}
                        className="w-9 shrink-0 rounded-lg border border-slate-300 bg-slate-50 px-1 py-2 text-sm" title="Elegir insumo cargado">
                        <option value="">📋</option>
                        {insumos.map((ins) => <option key={ins.nombre} value={ins.nombre}>{ins.nombre} ({CLP(ins.costo)}/{ins.unidad})</option>)}
                      </select>
                      <input value={it.nombre} onChange={(e) => setItem(i, { nombre: e.target.value })} placeholder="insumo" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
                      <input type="number" min={0} step="any" value={it.cantidad} onChange={(e) => setItem(i, { cantidad: Math.max(0, Number(e.target.value) || 0) })} className="w-14 rounded-lg border border-slate-300 px-2 py-2 text-center text-sm" />
                      <input type="number" min={0} value={it.costoUnit} onChange={(e) => setItem(i, { costoUnit: Math.max(0, Number(e.target.value) || 0) })} placeholder="$ c/u" className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
                      <button type="button" onClick={() => delItem(i)} className="shrink-0 text-slate-400 hover:text-red-500">✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItem} className="mt-2 w-full rounded-lg border border-dashed border-slate-300 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-50">+ Agregar insumo</button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <label className="text-xs font-bold text-slate-600">Rinde (unidades)
                  <input value={rendimiento} onChange={(e) => setRendimiento(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
                </label>
                <label className="text-xs font-bold text-slate-600">Costo extra $ (lote)
                  <input value={costoExtra} onChange={(e) => setCostoExtra(e.target.value)} inputMode="numeric" placeholder="mano obra…" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
                </label>
                <label className="text-xs font-bold text-slate-600">Precio venta $ (unidad)
                  <input value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} inputMode="numeric" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
                </label>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs font-bold text-slate-600">Costo compra $ (a fábrica, unidad)
                <input value={costoCompra} onChange={(e) => setCostoCompra(e.target.value)} inputMode="numeric" placeholder="Ej: 250" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
              </label>
              <label className="text-xs font-bold text-slate-600">Precio venta $ (ruta, unidad)
                <input value={precioVenta} onChange={(e) => setPrecioVenta(e.target.value)} inputMode="numeric" placeholder="Ej: 500" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
              </label>
            </div>
          )}

          <label className="block text-xs font-bold text-slate-600">🎯 Meta de venta al mes (unidades) — para comparar con lo real
            <input value={metaUnidades} onChange={(e) => setMetaUnidades(e.target.value)} inputMode="numeric" placeholder="Ej: 1000" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
          </label>

          <label className="block text-xs font-bold text-slate-600">Enlazar a producto real (opcional, para el informe de ventas)
            <select name="productoId" value={productoId ?? ""} onChange={(e) => setProductoId(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm">
              <option value="">— Sin enlazar —</option>
              {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </label>

          {/* Resultado producto */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Res label="Costo por unidad" valor={CLP(costoUnidad)} />
            <Res label="Utilidad por unidad" valor={CLP(utilUnidad)} color={utilUnidad >= 0 ? "#15803d" : "#b91c1c"} />
            <Res label="Margen" valor={`${Math.round(margen)}%`} color={margen >= 0 ? "#15803d" : "#b91c1c"} />
            <Res label="Utilidad esperada/mes" valor={CLP(utilUnidad * n(metaUnidades))} color={utilUnidad >= 0 ? "#15803d" : "#b91c1c"} />
          </div>
          {n(metaUnidades) > 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Si vendes la meta de <b>{n(metaUnidades)}</b> al mes a {CLP(pv)} c/u, esperas <b>{CLP(utilUnidad * n(metaUnidades))}</b> de utilidad. En el informe verás si lo real supera o queda bajo esto.
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-bold text-slate-600">Inversión $ (lo que cuesta)
              <input value={inversion} onChange={(e) => setInversion(e.target.value)} inputMode="numeric" placeholder="Ej: 400000" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-slate-600">Ganancia/ahorro por mes $
              <input value={retornoMensual} onChange={(e) => setRetornoMensual(e.target.value)} inputMode="numeric" placeholder="Ej: 80000" className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            </label>
          </div>
          <label className="block text-xs font-bold text-slate-600">Notas
            <textarea name="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Ej: enfriador para vender bebidas frías" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </label>

          {/* Resultado proyecto */}
          <div className="grid grid-cols-3 gap-2">
            <Res label="Se recupera en" valor={ret > 0 ? `${meses.toFixed(1)} meses` : "—"} />
            <Res label="Ganancia a 12 meses" valor={CLP(anual)} color={anual >= 0 ? "#15803d" : "#b91c1c"} />
            <Res label="Inversión" valor={CLP(inv)} />
          </div>
          {ret > 0 && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Con {CLP(ret)} al mes, recuperas los {CLP(inv)} en <b>{meses.toFixed(1)} meses</b> (≈ {Math.ceil(meses)} meses). Después, es ganancia.
            </p>
          )}
        </div>
      )}

      <button className="mt-4 w-full rounded-xl bg-[#1479c4] py-3 text-sm font-extrabold text-white active:brightness-110">
        💾 Guardar {inicial?.id ? "cambios" : "cálculo"}
      </button>
    </form>
  );
}

function Res({ label, valor, color }: { label: string; valor: string; color?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-center">
      <p className="text-sm font-extrabold tabular-nums" style={{ color: color ?? "#0f172a" }}>{valor}</p>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}
