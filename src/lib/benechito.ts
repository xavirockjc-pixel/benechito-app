/**
 * Contenido de marca Benechito (sabores, cuchuflís, beneficios, pasos).
 * Fuente: láminas oficiales de presentación. Esta data alimenta la landing
 * y sirve de base para el catálogo del panel/CRM.
 */

export type Sabor = {
  nombre: string;
  base: "blanca" | "cafe";
  decorado: string;
  color: string; // color de acento para la ficha (cápsula/etiqueta)
};

/** 9 sabores de trufas (pack de 3 unidades). No son rellenas. */
export const trufas: Sabor[] = [
  // Base chocolate blanco + manjar
  { nombre: "Frutilla", base: "blanca", decorado: "Chocolate blanco y frutilla deshidratada", color: "#c53c2e" },
  { nombre: "Pistacho", base: "blanca", decorado: "Chocolate blanco y pistacho trozado", color: "#2f7d34" },
  { nombre: "Manjar Nueces", base: "blanca", decorado: "Chocolate blanco y nueces picadas", color: "#a9762f" },
  { nombre: "Banana Chips", base: "blanca", decorado: "Chocolate blanco y banana chips deshidratada", color: "#d6a413" },
  { nombre: "Coco Chips", base: "blanca", decorado: "Chocolate blanco y coco chips naturales", color: "#7c6a55" },
  // Base chocolate café + manjar
  { nombre: "Tradicional", base: "cafe", decorado: "Granillo de chocolate café", color: "#3a2417" },
  { nombre: "Café Latte", base: "cafe", decorado: "Chocolate café y café", color: "#5a3a22" },
  { nombre: "Avellana", base: "cafe", decorado: "Chocolate café y avellana picada", color: "#6b4423" },
  { nombre: "Almendra", base: "cafe", decorado: "Chocolate café y almendra picada", color: "#8a5a2b" },
];

export type Cuchufli = {
  nombre: string;
  tipo: "Bañado" | "Relleno";
  detalle: string;
};

/** Cuchuflís: bañados (pack 5) y rellenos (pack 9). */
export const cuchuflis: Cuchufli[] = [
  { nombre: "Chocolate", tipo: "Bañado", detalle: "Bañados en chocolate café con trocitos crocantes" },
  { nombre: "Manjar", tipo: "Relleno", detalle: "Rellenos de manjar y bañados en chocolate café" },
  { nombre: "Blanco", tipo: "Relleno", detalle: "Rellenos de manjar y bañados en chocolate blanco" },
  { nombre: "Manjar · Nuez", tipo: "Relleno", detalle: "Manjar con trozos de nuez, bañados en chocolate café" },
  { nombre: "Manjar · Almendra", tipo: "Relleno", detalle: "Manjar con almendras picadas, bañados en chocolate café" },
];

/** Líneas de helados artesanales (producto protagonista de la marca). */
export const lineasHelados = [
  {
    nombre: "Paletas de Leche",
    formato: "80 ml",
    img: "/productos/paletas-leche.jpg",
    color: "#d8a944",
    texto: "Cremosas y llenas de sabor: vainilla, manjar, frutilla, plátano y más.",
  },
  {
    nombre: "Paletas de Agua",
    formato: "80 ml",
    img: "/productos/paletas-agua.jpg",
    color: "#e23b2c",
    texto: "Refrescantes y frutales, perfectas para el calor. Colores que llaman.",
  },
  {
    nombre: "Tú y Yo",
    formato: "125 ml",
    img: "/productos/tu-y-yo.jpg",
    color: "#1479c4",
    texto: "El clásico para compartir. Valentín, pistacho maní, algodón de chicle y muchos más.",
  },
  {
    nombre: "Paletas Premium",
    formato: "Exclusivas",
    img: "/productos/paletas-premium.jpg",
    color: "#7a4bbd",
    texto: "Cookies & Cream, Crema Frutilla, Manjar Nueces, Moca, Chocolate Kiss y más.",
  },
  {
    nombre: "Postres Helados",
    formato: "500 ml",
    img: "/productos/postres.jpg",
    color: "#5a3a22",
    texto: "Cremosos y contundentes: menta y chocolate, choco brownie, coco y chips.",
  },
];

/** Postres helados artesanales (tarrinas cremosas 500 ml). */
export const postres = [
  "Menta y Chocolate",
  "Choco Brownie",
  "Crema Coco y Chips",
  "Vainilla Oreo",
  "Crema de Maracuyá",
];

/** Algunos sabores representativos de helados. */
export const saboresHelados = [
  "Pistacho", "Manjar Nueces", "Turrón de Maní", "Menta Chocolate",
  "Vainilla Oreo", "Banana Split", "Kiss Chocolate", "Manjar Chocolate",
  "Frutos Rojos", "Chocolate Brownie", "Tres Leches", "Pie de Limón",
  "Maracuyá", "Mango", "Coco Chips",
];

/** Cómo funciona un Punto Benechito para el negocio. */
export const comoFunciona = [
  { icono: "🚚", titulo: "Instalamos tu exhibidor", texto: "La góndola dorada llega lista, sin costo adicional de instalación." },
  { icono: "📦", titulo: "Lo abastecemos", texto: "Productos artesanales de alta rotación, listos para vender." },
  { icono: "🔄", titulo: "Lo reponemos", texto: "Pasamos periódicamente a reponer. Tú no te preocupas de nada." },
  { icono: "🤝", titulo: "Tú vendes, nosotros apoyamos", texto: "Juntos hacemos crecer tu negocio." },
];

/** Beneficios para el comercio. */
export const beneficios = [
  { icono: "📈", titulo: "Mayor venta por impulso" },
  { icono: "😊", titulo: "Clientes más felices" },
  { icono: "⭐", titulo: "Te diferencias de la competencia" },
  { icono: "🏪", titulo: "Más rentabilidad para tu negocio" },
];

/** Qué hace diferentes a los productos. */
export const diferenciadores = [
  { titulo: "Fruta natural deshidratada", texto: "Frutilla, banana, naranja: fruta de verdad, no esencias." },
  { titulo: "Frutos secos reales", texto: "Pistacho, nueces, almendras y avellanas seleccionados." },
  { titulo: "Decoración 100% manual", texto: "Cada trufa se decora a mano, una por una." },
  { titulo: "Reposición permanente", texto: "Tu góndola siempre con producto fresco y variado." },
];

/** Presentación artesanal: así llega la trufa al cliente. */
export const pasosPresentacion = [
  { n: 1, titulo: "Trufa artesanal", texto: "Elaborada con manjar y chocolate, decorada a mano." },
  { n: 2, titulo: "Cápsula de color", texto: "Mini revestimiento que protege y aporta color por sabor." },
  { n: 3, titulo: "Estuche impreso", texto: "Estuche de couche exclusivo Benechito con 3 trufas." },
  { n: 4, titulo: "Bolsa PET sellada", texto: "Celofán transparente sellado que mantiene la frescura." },
  { n: 5, titulo: "Etiqueta por sabor", texto: "Ilustración del sabor e información del producto." },
];

/** Especificaciones del pack de trufas. */
export const specs = [
  { label: "Unidades", valor: "3 por pack" },
  { label: "Presentación", valor: "50 packs por caja" },
  { label: "Vida útil", valor: "45 días" },
  { label: "Tamaño pack", valor: "12 × 4 × 2,5 cm" },
];

/** Líneas de innovación / próximos lanzamientos. */
export const innovacion = [
  { emoji: "🍓", titulo: "Ediciones de temporada", texto: "Sabores especiales según la época del año." },
  { emoji: "💪", titulo: "Trufas proteicas", texto: "Línea funcional para un público más saludable." },
  { emoji: "✨", titulo: "Sabores especiales", texto: "Combinaciones únicas que sorprenden." },
  { emoji: "🍦", titulo: "Helados artesanales", texto: "Fábrica de helados, clave para primavera–verano." },
];
