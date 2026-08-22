// Carga inicial de datos Benechito.
// Ejecutar con:  npm run seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// --- Productos que se VENDEN y tienen precio (por línea/formato, NO por sabor) ---
const productos = [
  { linea: "trufa",    nombre: "Trufas",            formato: "pack 3",           sku: "TRF-pack3" },
  { linea: "cuchufli", nombre: "Cuchuflí bañado",   formato: "pack 5",           sku: "CCH-banado-p5" },
  { linea: "cuchufli", nombre: "Cuchuflí relleno",  formato: "pack 9",           sku: "CCH-relleno-p9" },
  { linea: "helado",   nombre: "Tú y Yo",           formato: "unidad (pack 50)", categoria: "Helados", sku: "HEL-tu-y-yo" },
  { linea: "helado",   nombre: "Paleta de Leche",   formato: "unidad (pack 50)", categoria: "Helados", sku: "HEL-paleta-de-leche" },
  { linea: "helado",   nombre: "Paleta de Agua",    formato: "unidad (pack 50)", categoria: "Helados", sku: "HEL-paleta-de-agua" },
  { linea: "helado",   nombre: "Paleta Premium",    formato: "unidad",           categoria: "Helados", sku: "HEL-paleta-premium" },
  { linea: "helado",   nombre: "Postre 500 ml",     formato: "500 ml (pack 16)", categoria: "Helados", sku: "HEL-postre-500-ml" },
];

// --- Sabores (apartado propio: producción y reposición por sabor, SIN precio) ---
const saboresTrufa = ["Frutilla", "Pistacho", "Manjar Nueces", "Banana Chips", "Coco Chips", "Tradicional", "Café Latte", "Avellana", "Almendra"];
const saboresCuchufli = ["Chocolate", "Manjar", "Blanco", "Manjar Nuez", "Manjar Almendra"];
const sabores = [
  ...saboresTrufa.map((nombre) => ({ nombre, linea: "trufa" })),
  ...saboresCuchufli.map((nombre) => ({ nombre, linea: "cuchufli" })),
];

// SKUs viejos (cuando las trufas/cuchuflís eran productos por sabor): se limpian.
const skusObsoletos = [
  ...saboresTrufa.map((n) => `TRF-${slug(n)}`),
  ...saboresCuchufli.map((n) => `CCH-${slug(n)}`),
];

async function main() {
  // Limpiar productos-por-sabor viejos (si existen y no tienen referencias).
  let limpiados = 0;
  for (const sku of skusObsoletos) {
    const viejo = await prisma.producto.findUnique({ where: { sku } });
    if (!viejo) continue;
    try {
      await prisma.producto.delete({ where: { id: viejo.id } });
      limpiados++;
    } catch {
      // tiene referencias (precios/ventas): lo desactivamos en vez de borrar.
      await prisma.producto.update({ where: { id: viejo.id }, data: { activo: false } });
    }
  }
  if (limpiados) console.log(`✔ ${limpiados} productos-por-sabor viejos eliminados`);

  // Productos que se venden (idempotente por sku)
  for (const p of productos) {
    await prisma.producto.upsert({
      where: { sku: p.sku },
      update: { nombre: p.nombre, linea: p.linea, formato: p.formato, categoria: p.categoria ?? null, activo: true },
      create: p,
    });
  }
  console.log(`✔ ${productos.length} productos cargados`);

  // Sabores (idempotente por nombre+línea)
  for (const s of sabores) {
    const existe = await prisma.sabor.findFirst({ where: { nombre: s.nombre, linea: s.linea } });
    if (!existe) await prisma.sabor.create({ data: s });
  }
  console.log(`✔ ${sabores.length} sabores cargados`);

  // --- v2: Núcleo multiubicación (Empresa → Sucursal → Ubicaciones) ---
  let empresa = await prisma.empresa.findFirst({ where: { nombre: "Benechito" } });
  if (!empresa) empresa = await prisma.empresa.create({ data: { nombre: "Benechito" } });

  let sucursal = await prisma.sucursal.findFirst({ where: { empresaId: empresa.id, nombre: "Coronel" } });
  if (!sucursal) sucursal = await prisma.sucursal.create({ data: { empresaId: empresa.id, nombre: "Coronel" } });

  const ubicaciones = [
    { nombre: "Bodega Fábrica", tipo: "bodega" },   // Río Salado 963
    { nombre: "Sala de Ventas", tipo: "sala" },     // Manuel Montt 0860
    { nombre: "Vehículo 1", tipo: "vehiculo" },
  ];
  for (const u of ubicaciones) {
    const existe = await prisma.ubicacion.findFirst({ where: { sucursalId: sucursal.id, nombre: u.nombre } });
    if (!existe) await prisma.ubicacion.create({ data: { ...u, sucursalId: sucursal.id } });
  }
  console.log(`✔ Núcleo: 1 empresa, 1 sucursal, ${ubicaciones.length} ubicaciones`);

  // --- v2: Listas de precios (estructura; los PRECIOS reales se cargan en E2) ---
  const listas = [
    { nombre: "Sala de Ventas",  canal: "sala" },
    { nombre: "Web",             canal: "web" },
    { nombre: "Reparto",         canal: "reparto" },
    { nombre: "Negocio",         canal: "negocio" },
    { nombre: "Punto Benechito", canal: "punto" },
    { nombre: "Revendedor",      canal: "revendedor" },
    { nombre: "Distribuidor",    canal: "distribuidor" },
    { nombre: "Supermercado",    canal: "supermercado" },
  ];
  for (const l of listas) {
    const existe = await prisma.listaPrecio.findFirst({ where: { canal: l.canal } });
    if (!existe) await prisma.listaPrecio.create({ data: l });
  }
  console.log(`✔ ${listas.length} listas de precios creadas (sin precios aún — se cargan en E2)`);

  // Usuario admin
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@benechito.com";
  const pass = process.env.SEED_ADMIN_PASSWORD ?? "benechito123";
  const nombre = process.env.SEED_ADMIN_NOMBRE ?? "Equipo Benechito";
  await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { email, nombre, rol: "admin", passwordHash: await bcrypt.hash(pass, 10) },
  });
  console.log(`✔ Usuario admin: ${email}`);

  // Usuario vendedor (para la app de terreno /vendedor)
  await prisma.usuario.upsert({
    where: { email: "vendedor@benechito.com" },
    update: {},
    create: {
      email: "vendedor@benechito.com",
      nombre: "Vendedor Ruta",
      rol: "vendedor",
      passwordHash: await bcrypt.hash("benechito123", 10),
    },
  });
  console.log("✔ Usuario vendedor: vendedor@benechito.com");

  // Usuario caja (para la app del cajero /caja)
  await prisma.usuario.upsert({
    where: { email: "caja@benechito.com" },
    update: {},
    create: { email: "caja@benechito.com", nombre: "Cajero Sala", rol: "caja", passwordHash: await bcrypt.hash("benechito123", 10) },
  });
  console.log("✔ Usuario caja: caja@benechito.com");

  // Usuario bodega (para la app de producción y bodegaje /bodega)
  await prisma.usuario.upsert({
    where: { email: "bodega@benechito.com" },
    update: {},
    create: { email: "bodega@benechito.com", nombre: "Producción y Bodega", rol: "bodega", passwordHash: await bcrypt.hash("benechito123", 10) },
  });
  console.log("✔ Usuario bodega: bodega@benechito.com");

  // Negocios de ejemplo (puedes borrarlos desde el panel)
  const ejemplos = [
    { nombreContacto: "Rosa Pérez", nombreNegocio: "Almacén Doña Rosa", whatsapp: "+56 9 1111 1111", comuna: "Puente Alto", tipoNegocio: "Almacén", estado: "punto_activo", interesHelados: true },
    { nombreContacto: "Luis Soto", nombreNegocio: "Kiosco El Sol", whatsapp: "+56 9 2222 2222", comuna: "Maipú", tipoNegocio: "Kiosco", estado: "nuevo" },
    { nombreContacto: "Carla Díaz", nombreNegocio: "Minimarket Díaz", whatsapp: "+56 9 3333 3333", comuna: "La Florida", tipoNegocio: "Minimarket", estado: "instalacion_pendiente" },
  ];
  const yaHay = await prisma.negocio.count();
  if (yaHay === 0) {
    for (const n of ejemplos) {
      await prisma.negocio.create({
        data: { ...n, origen: "manual", actividades: { create: { tipo: "creado", descripcion: "Negocio de ejemplo (seed)" } } },
      });
    }
    console.log(`✔ ${ejemplos.length} negocios de ejemplo creados`);
  } else {
    console.log("• Ya existen negocios, se omiten los ejemplos");
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
