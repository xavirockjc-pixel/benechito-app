// Campos compartidos por el alta y la edición de productos.
import type { Producto } from "@prisma/client";

const LINEAS = [
  { value: "trufa", label: "Trufas" },
  { value: "cuchufli", label: "Cuchuflís" },
  { value: "helado", label: "Helados" },
  { value: "proteico", label: "Proteicos" },
];

const inputCls =
  "mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30";

export function CamposProducto({ p }: { p?: Producto }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold text-navy">
        Nombre / sabor *
        <input name="nombre" required defaultValue={p?.nombre ?? ""} className={inputCls} />
      </label>

      <label className="text-sm font-bold text-navy">
        Línea *
        <select name="linea" required defaultValue={p?.linea ?? ""} className={inputCls}>
          <option value="">Selecciona…</option>
          {LINEAS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </label>

      <label className="text-sm font-bold text-navy">
        Formato / presentación
        <input name="formato" placeholder="pack 3, 500ml…" defaultValue={p?.formato ?? ""} className={inputCls} />
      </label>

      <label className="text-sm font-bold text-navy">
        Base <span className="font-normal text-choco-2">(trufas)</span>
        <input name="base" placeholder="blanca / cafe" defaultValue={p?.base ?? ""} className={inputCls} />
      </label>

      <label className="text-sm font-bold text-navy">
        Categoría
        <input name="categoria" defaultValue={p?.categoria ?? ""} className={inputCls} />
      </label>

      <label className="text-sm font-bold text-navy">
        SKU
        <input name="sku" placeholder="TRF-frutilla" defaultValue={p?.sku ?? ""} className={inputCls} />
      </label>

      <label className="text-sm font-bold text-navy">
        Código de barras
        <input name="codigoBarras" defaultValue={p?.codigoBarras ?? ""} className={inputCls} />
      </label>

      <label className="flex items-center gap-3 self-end pb-2 text-sm font-semibold text-navy">
        <input
          type="checkbox"
          name="activo"
          value="si"
          defaultChecked={p ? p.activo : true}
          className="h-5 w-5 accent-naranja"
        />
        Producto activo
      </label>
    </div>
  );
}
