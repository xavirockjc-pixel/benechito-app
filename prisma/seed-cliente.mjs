// ============================================================================
//  Semilla GENÉRICA de provisión — un cliente = un archivo prisma/clientes/<slug>.json
//
//  Uso:   CLIENTE=dacris npm run seed:cliente
//  Idempotente: se puede correr varias veces sin duplicar.
//
//  Claves (opcionales):
//    <CLIENTE>_ADMIN_EMAIL / _ADMIN_PASSWORD / _ADMIN_NOMBRE  (para el propietario)
//    <CLIENTE>_PASS   (clave por defecto del resto de usuarios)
//    Ej: DACRIS_ADMIN_PASSWORD=xxxx  DACRIS_PASS=yyyy  CLIENTE=dacris npm run seed:cliente
// ============================================================================
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const prisma = new PrismaClient();
const __dir = dirname(fileURLToPath(import.meta.url));
const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const CLIENTE = (process.env.CLIENTE || "").trim();
if (!CLIENTE) { console.error("Falta CLIENTE. Ej: CLIENTE=dacris npm run seed:cliente"); process.exit(1); }

let CFG;
try { CFG = JSON.parse(readFileSync(join(__dir, "clientes", CLIENTE + ".json"), "utf8")); }
catch (e) { console.error(`No pude leer prisma/clientes/${CLIENTE}.json`); process.exit(1); }

const ENV = (k, d) => process.env[`${CLIENTE.toUpperCase()}_${k}`] ?? d;
const PASS = ENV("PASS", CLIENTE + "123");
const PREFIJO = (CFG.skuPrefijo || CLIENTE.slice(0, 3)).toUpperCase();

async function main() {
  const e = CFG.empresa || { nombre: CLIENTE };
  // 1) Empresa
  let empresa = await prisma.empresa.findFirst({ where: { nombre: e.nombre } });
  if (!empresa) { empresa = await prisma.empresa.create({ data: e }); console.log(`✔ Empresa creada: ${e.nombre} (${e.rubro || "fabrica"})`); }
  else { await prisma.empresa.update({ where: { id: empresa.id }, data: { rubro: e.rubro || empresa.rubro } }); console.log(`• Empresa ${e.nombre} ya existía`); }

  // 2) Sucursal + ubicaciones
  const sucNombre = CFG.sucursal || "Principal";
  let suc = await prisma.sucursal.findFirst({ where: { empresaId: empresa.id, nombre: sucNombre } });
  if (!suc) suc = await prisma.sucursal.create({ data: { empresaId: empresa.id, nombre: sucNombre } });
  for (const u of (CFG.ubicaciones || [])) {
    const ex = await prisma.ubicacion.findFirst({ where: { sucursalId: suc.id, nombre: u.nombre } });
    if (!ex) await prisma.ubicacion.create({ data: { ...u, sucursalId: suc.id } });
  }
  console.log(`✔ Sucursal ${sucNombre} + ${(CFG.ubicaciones || []).length} ubicaciones`);

  // 3) Listas de precio
  const listas = {};
  for (const l of (CFG.listas || [])) {
    let li = await prisma.listaPrecio.findFirst({ where: { canal: l.canal } });
    if (!li) li = await prisma.listaPrecio.create({ data: l });
    listas[l.canal] = li;
  }
  console.log(`✔ ${(CFG.listas || []).length} listas de precio`);

  // 4) Productos + precios
  const canales = (CFG.listas || []).map((l) => l.canal);
  for (const p of (CFG.catalogo || [])) {
    const sku = PREFIJO + "-" + slug(p.nombre);
    const prod = await prisma.producto.upsert({
      where: { sku },
      update: { nombre: p.nombre, categoria: p.cat, descripcion: p.desc || null, tipo: p.tipo || "propio", activo: true, publicarTienda: true },
      create: {
        sku, linea: slug(p.cat || "general"), nombre: p.nombre, categoria: p.cat || null, descripcion: p.desc || null,
        tipo: p.tipo || "propio", seccion: "distribucion", soloLocal: (p.tipo === "reventa"),
        publicarTienda: true, activo: true,
      },
    });
    if (p.precio > 0) {
      for (const canal of canales) {
        await prisma.precioProducto.upsert({
          where: { productoId_listaId_cantidadMinima: { productoId: prod.id, listaId: listas[canal].id, cantidadMinima: 1 } },
          update: { precio: p.precio },
          create: { productoId: prod.id, listaId: listas[canal].id, cantidadMinima: 1, precio: p.precio },
        });
      }
    }
  }
  console.log(`✔ ${(CFG.catalogo || []).length} productos cargados con precio (referencial)`);

  // 5) Usuarios por rol
  for (const u of (CFG.usuarios || [])) {
    const esAdmin = u.rol === "propietario" || u.rol === "admin";
    const email = esAdmin ? ENV("ADMIN_EMAIL", u.email) : u.email;
    const pass = esAdmin ? ENV("ADMIN_PASSWORD", PASS) : PASS;
    const nombre = esAdmin ? ENV("ADMIN_NOMBRE", u.nombre) : u.nombre;
    await prisma.usuario.upsert({
      where: { email },
      update: { nombre, rol: u.rol, activo: true },
      create: { email, nombre, rol: u.rol, passwordHash: await bcrypt.hash(pass, 10) },
    });
    console.log(`✔ Usuario ${u.rol}: ${email}`);
  }

  console.log(`\n🐝 ${e.nombre} provisionado. Entra a /login con el propietario y revisa la central.`);
  console.log("   ⚠ Cambia las claves por defecto antes de entregar los accesos.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
