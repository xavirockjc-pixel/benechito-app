// Carga inicial de datos Benechito.
// Ejecutar con:  npm run seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const slug = (s) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
   .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// --- Trufas (pack 3) ---
const trufas = [
  { nombre: "Frutilla", base: "blanca" },
  { nombre: "Pistacho", base: "blanca" },
  { nombre: "Manjar Nueces", base: "blanca" },
  { nombre: "Banana Chips", base: "blanca" },
  { nombre: "Coco Chips", base: "blanca" },
  { nombre: "Tradicional", base: "cafe" },
  { nombre: "Café Latte", base: "cafe" },
  { nombre: "Avellana", base: "cafe" },
  { nombre: "Almendra", base: "cafe" },
].map((t) => ({ ...t, linea: "trufa", formato: "pack 3", sku: `TRF-${slug(t.nombre)}` }));

// --- Cuchuflís (bañados pack 5 / rellenos pack 9) ---
const cuchuflis = [
  { nombre: "Chocolate", formato: "pack 5" },
  { nombre: "Manjar", formato: "pack 9" },
  { nombre: "Blanco", formato: "pack 9" },
  { nombre: "Manjar Nuez", formato: "pack 9" },
  { nombre: "Manjar Almendra", formato: "pack 9" },
].map((c) => ({ ...c, linea: "cuchufli", base: null, sku: `CCH-${slug(c.nombre)}` }));

const productos = [...trufas, ...cuchuflis];

async function main() {
  // Productos (idempotente por sku)
  for (const p of productos) {
    await prisma.producto.upsert({
      where: { sku: p.sku },
      update: { nombre: p.nombre, linea: p.linea, base: p.base ?? null, formato: p.formato },
      create: p,
    });
  }
  console.log(`✔ ${productos.length} productos cargados`);

  // Usuario admin
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@benechito.cl";
  const pass = process.env.SEED_ADMIN_PASSWORD ?? "benechito123";
  const nombre = process.env.SEED_ADMIN_NOMBRE ?? "Equipo Benechito";
  await prisma.usuario.upsert({
    where: { email },
    update: {},
    create: { email, nombre, rol: "admin", passwordHash: await bcrypt.hash(pass, 10) },
  });
  console.log(`✔ Usuario admin: ${email}`);

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
