import { prisma } from "@/lib/prisma";
import type { RubroId } from "./rubros";

/**
 * Seed por rubro: datos base que se precargan al dar de alta un cliente, según su
 * rubro, para que el sistema no arranque vacío. Es idempotente (se puede correr
 * varias veces sin duplicar). Parte de la Fase 2 de "un motor, muchas colmenas".
 */
export type SeedRubro = {
  sucursal: string;
  ubicaciones: { nombre: string; tipo: string }[]; // bodega | sala | vehiculo
  listas: { nombre: string; canal: string }[];
  tipos: { nombre: string; seccion: string }[];
  formatos: { nombre: string; tipo: string }[]; // tipo = nombre del tipo (se normaliza)
};

/** Normaliza un texto a código simple (igual criterio que en sabores/actions). */
function codigoDe(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "otro";
}

const UBIC_FABRICA = [
  { nombre: "Bodega", tipo: "bodega" },
  { nombre: "Sala de Ventas", tipo: "sala" },
  { nombre: "Vehículo 1", tipo: "vehiculo" },
];

export const SEED: Record<RubroId, SeedRubro> = {
  heladeria: {
    sucursal: "Principal",
    ubicaciones: [{ nombre: "Bodega Fábrica", tipo: "bodega" }, { nombre: "Sala de Ventas", tipo: "sala" }, { nombre: "Vehículo 1", tipo: "vehiculo" }],
    listas: [
      { nombre: "Sala de Ventas", canal: "sala" }, { nombre: "Web", canal: "web" }, { nombre: "Reparto", canal: "reparto" },
      { nombre: "Negocio", canal: "negocio" }, { nombre: "Revendedor", canal: "revendedor" }, { nombre: "Distribuidor", canal: "distribuidor" },
    ],
    tipos: [
      { nombre: "Trufas", seccion: "dulce" }, { nombre: "Cuchuflí", seccion: "dulce" }, { nombre: "Cocadas", seccion: "dulce" },
      { nombre: "Paletas de agua", seccion: "helado" }, { nombre: "Paletas de leche", seccion: "helado" }, { nombre: "Paletas Premium", seccion: "helado" },
      { nombre: "Tú y Yo", seccion: "helado" }, { nombre: "Postres", seccion: "helado" },
    ],
    formatos: [
      { nombre: "3 unidades", tipo: "Trufas" }, { nombre: "Bandeja 40", tipo: "Trufas" },
      { nombre: "Pack 5", tipo: "Cuchuflí" }, { nombre: "Bandeja 80", tipo: "Cuchuflí" }, { nombre: "500 ml", tipo: "Postres" },
    ],
  },
  fabrica: {
    sucursal: "Principal",
    ubicaciones: UBIC_FABRICA,
    listas: [{ nombre: "Sala", canal: "sala" }, { nombre: "Web", canal: "web" }, { nombre: "Negocio", canal: "negocio" }, { nombre: "Distribuidor", canal: "distribuidor" }],
    tipos: [{ nombre: "Producto", seccion: "general" }],
    formatos: [{ nombre: "Unidad", tipo: "Producto" }, { nombre: "Caja", tipo: "Producto" }],
  },
  panaderia: {
    sucursal: "Principal",
    ubicaciones: [{ nombre: "Despensa", tipo: "bodega" }, { nombre: "Mostrador", tipo: "sala" }, { nombre: "Reparto", tipo: "vehiculo" }],
    listas: [{ nombre: "Mostrador", canal: "sala" }, { nombre: "Web", canal: "web" }, { nombre: "Negocio", canal: "negocio" }],
    tipos: [{ nombre: "Panadería", seccion: "panaderia" }, { nombre: "Pastelería", seccion: "pasteleria" }, { nombre: "Galletas", seccion: "galletas" }],
    formatos: [{ nombre: "Unidad", tipo: "Panadería" }, { nombre: "Docena", tipo: "Panadería" }, { nombre: "Porción", tipo: "Pastelería" }],
  },
  comida_rapida: {
    sucursal: "Principal",
    ubicaciones: [{ nombre: "Cocina / Almacén", tipo: "bodega" }, { nombre: "Mostrador", tipo: "sala" }, { nombre: "Moto", tipo: "vehiculo" }],
    listas: [{ nombre: "Mostrador", canal: "sala" }, { nombre: "Delivery / Web", canal: "web" }],
    tipos: [{ nombre: "Hamburguesas", seccion: "comida" }, { nombre: "Completos", seccion: "comida" }, { nombre: "Acompañamientos", seccion: "comida" }, { nombre: "Bebidas", seccion: "bebidas" }],
    formatos: [{ nombre: "Individual", tipo: "Hamburguesas" }, { nombre: "Combo", tipo: "Hamburguesas" }, { nombre: "Familiar", tipo: "Acompañamientos" }],
  },
  restaurante: {
    sucursal: "Principal",
    ubicaciones: [{ nombre: "Bodega / Cava", tipo: "bodega" }, { nombre: "Salón", tipo: "sala" }, { nombre: "Reparto", tipo: "vehiculo" }],
    listas: [{ nombre: "Salón", canal: "sala" }, { nombre: "Delivery / Web", canal: "web" }],
    tipos: [{ nombre: "Entradas", seccion: "comida" }, { nombre: "Platos de fondo", seccion: "comida" }, { nombre: "Postres", seccion: "postres" }, { nombre: "Bebidas", seccion: "bebidas" }],
    formatos: [{ nombre: "Porción", tipo: "Entradas" }, { nombre: "Individual", tipo: "Platos de fondo" }],
  },
  distribuidora: {
    sucursal: "Principal",
    ubicaciones: [{ nombre: "Bodega central", tipo: "bodega" }, { nombre: "Vehículo 1", tipo: "vehiculo" }],
    listas: [{ nombre: "Negocio", canal: "negocio" }, { nombre: "Distribuidor", canal: "distribuidor" }, { nombre: "Reparto", canal: "reparto" }, { nombre: "Web", canal: "web" }],
    tipos: [{ nombre: "Productos", seccion: "general" }],
    formatos: [{ nombre: "Unidad", tipo: "Productos" }, { nombre: "Caja", tipo: "Productos" }, { nombre: "Pallet", tipo: "Productos" }],
  },
  almacen: {
    sucursal: "Principal",
    ubicaciones: [{ nombre: "Bodega", tipo: "bodega" }, { nombre: "Mostrador", tipo: "sala" }],
    listas: [{ nombre: "Mostrador", canal: "sala" }],
    tipos: [{ nombre: "Abarrotes", seccion: "general" }, { nombre: "Bebidas", seccion: "bebidas" }, { nombre: "Snacks", seccion: "general" }],
    formatos: [{ nombre: "Unidad", tipo: "Abarrotes" }],
  },
  construccion: {
    sucursal: "Principal",
    ubicaciones: [{ nombre: "Bodega de materiales", tipo: "bodega" }, { nombre: "Oficina", tipo: "sala" }, { nombre: "Camión de despacho", tipo: "vehiculo" }],
    listas: [{ nombre: "Negocio", canal: "negocio" }, { nombre: "Distribuidor", canal: "distribuidor" }, { nombre: "Web", canal: "web" }],
    tipos: [{ nombre: "Materiales", seccion: "materiales" }, { nombre: "Áridos", seccion: "materiales" }, { nombre: "Fierros", seccion: "materiales" }, { nombre: "Herramientas", seccion: "herramientas" }],
    formatos: [{ nombre: "Unidad", tipo: "Materiales" }, { nombre: "Saco", tipo: "Materiales" }, { nombre: "M³", tipo: "Áridos" }],
  },
  manufactura: {
    sucursal: "Principal",
    ubicaciones: [{ nombre: "Bodega de insumos", tipo: "bodega" }, { nombre: "Bodega producto terminado", tipo: "bodega" }, { nombre: "Despacho", tipo: "vehiculo" }],
    listas: [{ nombre: "Negocio", canal: "negocio" }, { nombre: "Distribuidor", canal: "distribuidor" }, { nombre: "Web", canal: "web" }],
    tipos: [{ nombre: "Línea A", seccion: "general" }, { nombre: "Línea B", seccion: "general" }],
    formatos: [{ nombre: "Unidad", tipo: "Línea A" }, { nombre: "Caja", tipo: "Línea A" }],
  },
  consultoria: {
    sucursal: "Principal",
    ubicaciones: [{ nombre: "Recepción", tipo: "sala" }],
    listas: [{ nombre: "General", canal: "sala" }],
    tipos: [{ nombre: "Servicios", seccion: "servicios" }],
    formatos: [{ nombre: "Sesión", tipo: "Servicios" }, { nombre: "Plan mensual", tipo: "Servicios" }],
  },
};

/** Aplica el seed del rubro a una empresa (idempotente). Devuelve los conteos. */
export async function precargarRubro(empresaId: string, rubroId: RubroId) {
  const s = SEED[rubroId] ?? SEED.fabrica;

  let suc = await prisma.sucursal.findFirst({ where: { empresaId } });
  if (!suc) suc = await prisma.sucursal.create({ data: { empresaId, nombre: s.sucursal } });

  for (const u of s.ubicaciones) {
    const ex = await prisma.ubicacion.findFirst({ where: { sucursalId: suc.id, nombre: u.nombre } });
    if (!ex) await prisma.ubicacion.create({ data: { ...u, sucursalId: suc.id } });
  }
  for (const l of s.listas) {
    const ex = await prisma.listaPrecio.findFirst({ where: { canal: l.canal } });
    if (!ex) await prisma.listaPrecio.create({ data: l });
  }
  for (const t of s.tipos) {
    const codigo = codigoDe(t.nombre);
    await prisma.tipo.upsert({ where: { codigo }, update: {}, create: { codigo, nombre: t.nombre, seccion: t.seccion } });
  }
  for (const f of s.formatos) {
    const linea = codigoDe(f.tipo);
    const ex = await prisma.formato.findFirst({ where: { nombre: f.nombre, linea } });
    if (!ex) await prisma.formato.create({ data: { nombre: f.nombre, linea } });
  }

  return { ubicaciones: s.ubicaciones.length, listas: s.listas.length, tipos: s.tipos.length, formatos: s.formatos.length };
}
