import { prisma } from "@/lib/prisma";
import Tienda from "./Tienda";

export const dynamic = "force-dynamic";

// Tarifas que el cliente puede elegir en la tienda (cada una lee su lista de precios).
export const TARIFAS_TIENDA = [
  { codigo: "detalle", canal: "sala", label: "Consumidor / detalle", icono: "🧍", cond: "Precio por unidad" },
  { codigo: "online", canal: "web", label: "Promocional online", icono: "💻", cond: "Ofertas de la tienda" },
  { codigo: "comerciante", canal: "negocio", label: "Mayorista / comerciante", icono: "🏪", cond: "Para negocios y repartos" },
  { codigo: "distribuidor", canal: "distribuidor", label: "Distribuidor", icono: "🚚", cond: "Compra por volumen" },
] as const;

// Foto por defecto (assets de la web) según el producto, si no subió una propia.
function imagenDefault(nombre: string): string | null {
  const n = nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (n.includes("paleta de leche")) return "/productos/paletas-leche.jpg";
  if (n.includes("paleta de agua")) return "/productos/paletas-agua.jpg";
  if (n.includes("premi")) return "/productos/paletas-premium.jpg";
  if (n.includes("tu y yo")) return "/productos/tu-y-yo.jpg";
  if (n.includes("postre")) return "/productos/postres.jpg";
  if (n.includes("cuchufli") && n.includes("banad")) return "/productos/cuchufli-b.jpg";
  if (n.includes("cuchufli")) return "/productos/cuchufli-a.jpg";
  if (n.includes("cocada")) return "/productos/pack-sin-precio.jpg";
  if (n.includes("trufa")) return "/productos/variedades.jpg";
  if (n.includes("pack") || n.includes("combo") || n.includes("bandeja")) return "/productos/pack-comercios.jpg";
  return null;
}

export default async function TiendaPage() {
  const empresa = await prisma.empresa.findFirst();

  // Listas por tarifa (por canal). Guarda qué tarifa corresponde a cada lista.
  const listas = await prisma.listaPrecio.findMany({ where: { canal: { in: TARIFAS_TIENDA.map((t) => t.canal) }, activo: true } });
  const tarifaDeLista: Record<string, string> = {};
  for (const t of TARIFAS_TIENDA) {
    const l = listas.find((x) => x.canal === t.canal);
    if (l) tarifaDeLista[l.id] = t.codigo;
  }
  const listaIds = Object.keys(tarifaDeLista);

  const precios = listaIds.length
    ? await prisma.precioProducto.findMany({
        where: { listaId: { in: listaIds }, cantidadMinima: 1, producto: { publicarTienda: true, activo: true } },
        include: { producto: true },
      })
    : [];

  // Sabores (con descripción/foto para el detalle "¿cómo es este sabor?").
  const sabores = await prisma.sabor.findMany({ where: { activo: true }, select: { nombre: true, linea: true, descripcion: true, fotoUrl: true }, orderBy: { nombre: "asc" } });
  const saboresPorLinea: Record<string, string[]> = {};
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
  const infoSabor: Record<string, { desc: string | null; foto: string | null }> = {};
  for (const s of sabores) {
    (saboresPorLinea[s.linea] ??= []).push(s.nombre);
    if (s.descripcion || s.fotoUrl) infoSabor[norm(s.nombre)] = { desc: s.descripcion, foto: s.fotoUrl };
  }
  // Sabores del producto (con info): propios (saboresTienda) o los de su línea; sin los agotados; + mixto.
  const saboresDe = (prod: { saboresTienda: string | null; saboresNoDisp: string | null; permiteMixto: boolean; linea: string }) => {
    const propios = (prod.saboresTienda ?? "").split(",").map((x) => x.trim()).filter(Boolean);
    const base = propios.length > 0 ? propios : (saboresPorLinea[prod.linea] ?? []);
    const noDisp = new Set((prod.saboresNoDisp ?? "").split(",").map((x) => x.trim()).filter(Boolean));
    const nombres = [...(prod.permiteMixto ? ["🎲 Mixto al azar"] : []), ...base.filter((s) => !noDisp.has(s))];
    return nombres.map((nombre) => ({ nombre, ...(infoSabor[norm(nombre)] ?? { desc: null, foto: null }) }));
  };

  // Grupo Helados / Dulces por línea (o por nombre, para combos con línea "otro").
  const DULCES = new Set(["trufa", "trufas", "cuchufli", "cocada"]);
  const grupoDe = (linea: string, nombre: string) =>
    DULCES.has(linea) || /trufa|cuchufl|cocada|bombon/.test(norm(nombre)) ? "dulces" : "helados";

  // Agrupa por producto y arma el precio de cada tarifa.
  const porProd = new Map<string, { producto: (typeof precios)[number]["producto"]; precios: Record<string, number> }>();
  for (const p of precios) {
    const tar = tarifaDeLista[p.listaId];
    if (!tar) continue;
    if (!porProd.has(p.producto.id)) porProd.set(p.producto.id, { producto: p.producto, precios: {} });
    porProd.get(p.producto.id)!.precios[tar] = Number(p.precio);
  }

  const productos = [...porProd.values()]
    .map(({ producto, precios }) => ({
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      formato: producto.formato,
      seccion: producto.seccion ?? "propio",
      fotoUrl: producto.fotoUrl || imagenDefault(producto.nombre),
      precios, // { detalle, online, comerciante, distribuidor }
      sabores: saboresDe(producto),
      grupo: grupoDe(producto.linea, producto.nombre),
      min: producto.minTienda ?? 1,
      max: producto.maxTienda ?? 0,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const tarifas = TARIFAS_TIENDA.map((t) => ({ codigo: t.codigo, label: t.label, icono: t.icono, cond: t.cond }));

  return (
    <Tienda
      negocio={empresa?.nombre ?? "Tienda"}
      logoUrl="/marca/logo.png"
      productos={productos}
      tarifas={tarifas}
      sinConfig={listaIds.length === 0 || productos.length === 0}
    />
  );
}
