import { prisma } from "@/lib/prisma";
import { POS_CSS } from "../estilos";
import { agregarProductoPOS } from "../actions";

// Agregar producto desde el POS de la TUU (Chrome viejo): formulario plano, sin voz
// ni cámara. Reutiliza el backend (crea producto + precio Sala + stock del local).
export const dynamic = "force-dynamic";

const lineaLabel: Record<string, string> = {
  trufa: "Trufas", cuchufli: "Cuchuflís", helado: "Helados", proteico: "Proteicos",
  paleta: "Paletas", cocada: "Cocadas", postre: "Postres", bebida: "Bebidas", snack: "Snacks", otro: "Otro",
};

export default async function NuevoProductoPOS({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const prods = await prisma.producto.findMany({ select: { linea: true } });
  const lineas = [...new Set([
    ...prods.map((p) => p.linea),
    "trufa", "cuchufli", "helado", "paleta", "cocada", "postre", "bebida", "snack", "otro",
  ])].filter(Boolean);

  return (
    <div className="posx-root">
      <style dangerouslySetInnerHTML={{ __html: POS_CSS }} />

      <header className="posx-head">
        <a href="/caja/pos" className="posx-head-back">←</a>
        <div className="posx-head-brand">
          <span className="posx-title">➕ Nuevo producto</span>
        </div>
      </header>
      <nav className="posx-nav">
        <a href="/caja/pos">🛒 Vender</a>
        <a href="/caja/pos/nuevo" className="posx-nav-on">➕ Producto</a>
        <a href="/caja/pos/vecina">🏧 Caja Vecina</a>
      </nav>

      <div className="posx-sub">
        <div className="posx-sub-inner">
          {sp.ok && <div className="posx-ok">✅ Producto “{sp.ok}” agregado. Ya aparece en Vender.</div>}
          {sp.err && <div className="posx-ok" style={{ background: "#fee2e2", borderColor: "#fca5a5", color: "#b91c1c" }}>Falta el nombre o la categoría.</div>}

          <form action={agregarProductoPOS} className="posx-card">
            <h2>Datos del producto</h2>
            <p className="posx-hint">Se agrega al inventario del local (Sala) y aparece al vender.</p>

            <label className="posx-lbl" htmlFor="nombre">Nombre *</label>
            <input id="nombre" name="nombre" className="posx-input" type="text" placeholder="Ej: Bebida lata 350ml" autoComplete="off" required />

            <label className="posx-lbl" htmlFor="linea">Categoría *</label>
            <select id="linea" name="linea" className="posx-input" defaultValue="">
              <option value="" disabled>Elige una categoría…</option>
              {lineas.map((l) => (
                <option key={l} value={l}>{lineaLabel[l] ?? l}</option>
              ))}
            </select>

            <label className="posx-lbl" htmlFor="tipo">Tipo</label>
            <select id="tipo" name="tipo" className="posx-input" defaultValue="reventa">
              <option value="reventa">Reventa (comprado para revender)</option>
              <option value="propio">Propio (fabricado por nosotros)</option>
            </select>

            <label className="posx-lbl" htmlFor="formato">Formato (opcional)</label>
            <input id="formato" name="formato" className="posx-input" type="text" placeholder="Ej: pack 5, unidad, 350ml" autoComplete="off" />

            <div className="posx-row">
              <div>
                <label className="posx-lbl" htmlFor="precio">Precio de venta</label>
                <div className="posx-money">
                  <span>$</span>
                  <input id="precio" name="precio" type="number" inputMode="numeric" min="0" step="1" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="posx-lbl" htmlFor="stock">Stock inicial</label>
                <input id="stock" name="stock" className="posx-input" type="number" inputMode="numeric" min="0" step="1" placeholder="0" />
              </div>
            </div>

            <label className="posx-lbl" htmlFor="stockMinimo">Alerta de stock bajo (opcional)</label>
            <input id="stockMinimo" name="stockMinimo" className="posx-input" type="number" inputMode="numeric" min="0" step="1" placeholder="0" />

            <label className="posx-lbl" htmlFor="fotoUrl">Foto por URL (opcional)</label>
            <input id="fotoUrl" name="fotoUrl" className="posx-input" type="text" placeholder="https://…" autoComplete="off" />

            <button type="submit" className="posx-btn-primary">Agregar producto</button>
          </form>
        </div>
      </div>
    </div>
  );
}
