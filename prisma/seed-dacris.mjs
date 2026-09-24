// ============================================================================
//  Semilla de PROVISIÓN — Cliente: Da'cris (Lota) · rubro comida rápida
//  Monta "la app + la central" para Da'cris en una instancia nueva.
//
//  Ejecutar (con la base ya migrada):   node prisma/seed-dacris.mjs
//  Es idempotente: puedes correrlo varias veces sin duplicar.
//
//  Variables opcionales (si no, usa los valores por defecto de abajo):
//    DACRIS_ADMIN_EMAIL, DACRIS_ADMIN_PASSWORD, DACRIS_ADMIN_NOMBRE
//    DACRIS_PASS  (clave por defecto para los demás usuarios)
// ============================================================================
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// --- Catálogo real de Da'cris (del flyer). Precios REFERENCIALES: ajústalos
//     desde la central (Admin → Productos / Precios) cuando tengas los reales. ---
const CATALOGO = [
  { cat: "Comida rápida", nombre: "Completos",     desc: "Italiano, dinámico o a lo pobre.", precio: 1500, tipo: "propio" },
  { cat: "Comida rápida", nombre: "Sandwiches",    desc: "Churrasco, mechada, as.",          precio: 2500, tipo: "propio" },
  { cat: "Comida rápida", nombre: "Papas fritas",  desc: "Solas o cargadas.",                precio: 2000, tipo: "propio" },
  { cat: "Comida rápida", nombre: "Pichangas",     desc: "Surtido para compartir.",          precio: 7900, tipo: "propio" },
  { cat: "Comida rápida", nombre: "Churros",       desc: "Rellenos de manjar o chocolate.",  precio: 1000, tipo: "propio" },
  { cat: "Helados",       nombre: "Helados soft",  desc: "Barquillo o vasito, con topping.", precio: 1500, tipo: "propio" },
  { cat: "Panadería",     nombre: "Empanadas",     desc: "De pino, queso o del día.",        precio: 1500, tipo: "propio" },
  { cat: "Panadería",     nombre: "Panadería",     desc: "Pan amasado y del día. Por kilo.", precio: 1800, tipo: "propio" },
  { cat: "Panadería",     nombre: "Dulces",        desc: "Pasteles, kuchen y dulces.",       precio: 0,    tipo: "propio" },
  { cat: "Abarrotes",     nombre: "Bebidas",       desc: "Lata o 1.5L, bien helada.",        precio: 1200, tipo: "reventa" },
  { cat: "Abarrotes",     nombre: "Golosinas y snacks", desc: "Dulces, galletas, cabritas.", precio: 500,  tipo: "reventa" },
];

// --- Usuarios / roles del negocio (la app por rol) ---
const PASS = process.env.DACRIS_PASS ?? "dacris123";
const USUARIOS = [
  { email: process.env.DACRIS_ADMIN_EMAIL ?? "dueno@dacris.cl", nombre: process.env.DACRIS_ADMIN_NOMBRE ?? "Dueño Da'cris", rol: "propietario", pass: process.env.DACRIS_ADMIN_PASSWORD ?? PASS },
  { email: "caja@dacris.cl",    nombre: "Cajero Mostrador", rol: "caja",       pass: PASS },
  { email: "cocina@dacris.cl",  nombre: "Cocina",           rol: "produccion", pass: PASS },
  { email: "reparto@dacris.cl", nombre: "Reparto",          rol: "chofer",     pass: PASS },
];

async function main() {
  // 1) Empresa (rubro comida_rapida → renombra áreas y oculta módulos de fábrica)
  let empresa = await prisma.empresa.findFirst({ where: { nombre: "Da'cris" } });
  if (!empresa) {
    empresa = await prisma.empresa.create({
      data: {
        nombre: "Da'cris",
        rubro: "comida_rapida",
        modoSimple: true,
        accesoRoles: "caja,produccion,chofer", // el propietario nunca queda bloqueado por horario
        accesoDesde: "10:00", accesoHasta: "23:59", accesoDias: "1,2,3,4,5,6,0",
      },
    });
    console.log("✔ Empresa creada: Da'cris (comida_rapida)");
  } else {
    await prisma.empresa.update({ where: { id: empresa.id }, data: { rubro: "comida_rapida" } });
    console.log("• Empresa Da'cris ya existía (rubro confirmado)");
  }

  // 2) Sucursal + ubicaciones (Local en Lota)
  let suc = await prisma.sucursal.findFirst({ where: { empresaId: empresa.id, nombre: "Lota" } });
  if (!suc) suc = await prisma.sucursal.create({ data: { empresaId: empresa.id, nombre: "Lota" } });
  const ubis = [
    { nombre: "Mostrador / Local", tipo: "sala" },
    { nombre: "Cocina",            tipo: "bodega" },
    { nombre: "Reparto",           tipo: "vehiculo" },
  ];
  for (const u of ubis) {
    const ex = await prisma.ubicacion.findFirst({ where: { sucursalId: suc.id, nombre: u.nombre } });
    if (!ex) await prisma.ubicacion.create({ data: { ...u, sucursalId: suc.id } });
  }
  console.log(`✔ Sucursal Lota + ${ubis.length} ubicaciones`);

  // 3) Listas de precio (mostrador, web, reparto)
  const listasDef = [
    { nombre: "Mostrador", canal: "sala" },
    { nombre: "Web",       canal: "web" },
    { nombre: "Reparto",   canal: "reparto" },
  ];
  const listas = {};
  for (const l of listasDef) {
    let li = await prisma.listaPrecio.findFirst({ where: { canal: l.canal } });
    if (!li) li = await prisma.listaPrecio.create({ data: l });
    listas[l.canal] = li;
  }
  console.log(`✔ ${listasDef.length} listas de precio`);

  // 4) Productos + precios (idempotente por sku)
  for (const p of CATALOGO) {
    const sku = "DAC-" + slug(p.nombre);
    const prod = await prisma.producto.upsert({
      where: { sku },
      update: { nombre: p.nombre, categoria: p.cat, descripcion: p.desc, tipo: p.tipo, activo: true, publicarTienda: true },
      create: {
        sku, linea: slug(p.cat), nombre: p.nombre, categoria: p.cat, descripcion: p.desc,
        tipo: p.tipo, seccion: "distribucion", soloLocal: p.tipo === "reventa",
        publicarTienda: true, activo: true,
      },
    });
    if (p.precio > 0) {
      for (const canal of ["sala", "web", "reparto"]) {
        await prisma.precioProducto.upsert({
          where: { productoId_listaId_cantidadMinima: { productoId: prod.id, listaId: listas[canal].id, cantidadMinima: 1 } },
          update: { precio: p.precio },
          create: { productoId: prod.id, listaId: listas[canal].id, cantidadMinima: 1, precio: p.precio },
        });
      }
    }
  }
  console.log(`✔ ${CATALOGO.length} productos cargados con precio (referencial)`);

  // 5) Usuarios por rol (la app) + propietario (la central)
  for (const u of USUARIOS) {
    await prisma.usuario.upsert({
      where: { email: u.email },
      update: { nombre: u.nombre, rol: u.rol, activo: true },
      create: { email: u.email, nombre: u.nombre, rol: u.rol, passwordHash: await bcrypt.hash(u.pass, 10) },
    });
    console.log(`✔ Usuario ${u.rol}: ${u.email}`);
  }

  console.log("\n🐝 Da'cris provisionado. Entra a /login con el usuario propietario y revisa la central.");
  console.log("   ⚠ Cambia las claves por defecto antes de entregar los accesos.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
