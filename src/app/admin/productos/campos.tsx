// Campos compartidos por el alta y la edición de productos.
import type { Producto } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const LINEAS = [
  { value: "trufa", label: "Trufas" },
  { value: "cuchufli", label: "Cuchuflís" },
  { value: "helado", label: "Helados" },
  { value: "proteico", label: "Proteicos" },
  { value: "bebida", label: "Bebidas" },
  { value: "snack", label: "Snacks" },
  { value: "abarrote", label: "Abarrotes" },
  { value: "distribucion", label: "Distribución" },
  { value: "otro", label: "Otro" },
];

const inputCls =
  "mt-1 w-full rounded-xl border border-crema-2 bg-crema/40 px-3 py-2.5 font-normal text-choco outline-none focus:border-naranja focus:ring-2 focus:ring-naranja/30";

export async function CamposProducto({ p }: { p?: Producto }) {
  const formatosDb = await prisma.formato.findMany({ where: { activo: true }, orderBy: { nombre: "asc" }, select: { nombre: true } });
  const formatos = [...new Set(formatosDb.map((f) => f.nombre))];
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-bold text-navy">
        Nombre / sabor *
        <input name="nombre" required defaultValue={p?.nombre ?? ""} className={inputCls} />
      </label>

      <label className="text-sm font-bold text-navy">
        Tipo *
        <select name="tipo" required defaultValue={p?.tipo ?? "propio"} className={inputCls}>
          <option value="propio">Propio (lo fabricas)</option>
          <option value="reventa">Reventa / Distribución (lo compras)</option>
        </select>
      </label>

      <label className="text-sm font-bold text-navy sm:col-span-2">
        Sección del catálogo *
        <select name="seccion" required defaultValue={p?.seccion ?? "propio"} className={inputCls}>
          <option value="propio">🏭 Fabricación (propios)</option>
          <option value="distribucion">🏪 Distribución (local)</option>
          <option value="ruta">🚚 Ruta / reventa</option>
          <option value="promo">🎁 Promos y combos</option>
        </select>
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
        <input name="formato" list="formatos-lista" placeholder="pack 3, 1.5 L, unidad…" defaultValue={p?.formato ?? ""} className={inputCls} />
        <datalist id="formatos-lista">{formatos.map((f) => <option key={f} value={f} />)}</datalist>
      </label>

      <label className="text-sm font-bold text-navy">
        Categoría <span className="font-normal text-choco-2">(para agrupar)</span>
        <input name="categoria" placeholder="Bebidas, Snacks…" defaultValue={p?.categoria ?? ""} className={inputCls} />
      </label>

      <label className="text-sm font-bold text-navy">
        Costo <span className="font-normal text-choco-2">(reventa: para el margen)</span>
        <input type="number" name="costo" min="0" step="1" inputMode="numeric" defaultValue={p?.costo != null ? String(p.costo) : ""} className={inputCls} />
      </label>

      <label className="text-sm font-bold text-navy">
        Base <span className="font-normal text-choco-2">(trufas)</span>
        <input name="base" placeholder="blanca / cafe" defaultValue={p?.base ?? ""} className={inputCls} />
      </label>

      <label className="text-sm font-bold text-navy">
        SKU
        <input name="sku" placeholder="TRF-frutilla" defaultValue={p?.sku ?? ""} className={inputCls} />
      </label>

      <label className="text-sm font-bold text-navy">
        Código de barras
        <input name="codigoBarras" defaultValue={p?.codigoBarras ?? ""} className={inputCls} />
      </label>

      <label className="text-sm font-bold text-navy sm:col-span-2">
        Foto / presentación <span className="font-normal text-choco-2">(link de imagen, para la tienda y el botón “Ver”)</span>
        <input name="fotoUrl" type="url" placeholder="https://…" defaultValue={p?.fotoUrl ?? ""} className={inputCls} />
      </label>

      <label className="text-sm font-bold text-navy sm:col-span-2">
        Descripción para la tienda <span className="font-normal text-choco-2">(opcional)</span>
        <input name="descripcion" placeholder="Ej: Paleta de leche artesanal, 100 g" defaultValue={p?.descripcion ?? ""} className={inputCls} />
      </label>

      <label className="flex items-start gap-3 self-end pb-2 text-sm font-semibold text-navy sm:col-span-2">
        <input type="checkbox" name="publicarTienda" value="si" defaultChecked={p ? p.publicarTienda : false} className="mt-0.5 h-5 w-5 accent-azul" />
        <span>
          🛒 Publicar en la tienda online <span className="font-normal text-choco-2">— aparece en /tienda con su foto y su precio de la lista Web. Necesita precio cargado.</span>
        </span>
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

      <label className="flex items-start gap-3 self-end pb-2 text-sm font-semibold text-navy sm:col-span-2">
        <input
          type="checkbox"
          name="soloLocal"
          value="si"
          defaultChecked={p ? p.soloLocal : false}
          className="mt-0.5 h-5 w-5 accent-naranja"
        />
        <span>
          Solo local <span className="font-normal text-choco-2">— vive únicamente en el local (Sala de Ventas) y la central.
          Se oculta de bodega, rutas y vendedor (ej: bebidas, snacks).</span>
        </span>
      </label>
    </div>
  );
}
