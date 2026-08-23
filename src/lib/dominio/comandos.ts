// Dominio: interpretación de COMANDOS de voz para el panel (versión sin IA).
// Convierte una frase dictada en una acción estructurada que el panel confirma.
// Ej: "orden de producción cien frutilla"  -> crear OP 100 × Frutilla
//     "agenda entrega dos surtido para el viernes" -> agenda entrega ...

export type ItemCat = { clase: "producto" | "sabor"; id: string; nombre: string; linea?: string };

export type Comando =
  | { intent: "orden"; clase: "producto" | "sabor"; refId: string; nombre: string; cantidad: number }
  | { intent: "agenda"; tipo: string; clase?: "producto" | "sabor"; refId?: string; nombre?: string; cantidad?: number; fecha: string; titulo: string }
  | { intent: "navegar"; ruta: string; label: string }
  | { intent: "desconocido"; texto: string };

// Módulos del panel a los que el asistente puede ir por voz. Cada uno con sus
// palabras (sinónimos, sin tilde) que lo activan.
const MODULOS: { ruta: string; label: string; palabras: string[] }[] = [
  { ruta: "/admin/dashboard", label: "Tablero", palabras: ["tablero", "dashboard", "resumen", "indicadores"] },
  { ruta: "/admin/agenda", label: "Agenda", palabras: ["agenda", "calendario", "agendados"] },
  { ruta: "/admin/pos", label: "Punto de venta", palabras: ["punto de venta", "pos", "caja", "vender", "venta rapida"] },
  { ruta: "/admin/negocios", label: "Clientes", palabras: ["clientes", "cliente", "negocios", "negocio", "crm"] },
  { ruta: "/admin/productos", label: "Catálogo", palabras: ["catalogo", "productos", "producto"] },
  { ruta: "/admin/precios", label: "Precios", palabras: ["precios", "precio", "listas de precios", "lista de precios"] },
  { ruta: "/admin/pedidos", label: "Pedidos", palabras: ["pedidos", "pedido"] },
  { ruta: "/admin/preventa", label: "Preventa", palabras: ["preventa", "preventas"] },
  { ruta: "/admin/rutas", label: "Rutas", palabras: ["rutas", "ruta"] },
  { ruta: "/admin/inventario", label: "Inventario", palabras: ["inventario", "stock", "bodega", "ubicaciones"] },
  { ruta: "/admin/ventas", label: "Ventas", palabras: ["ventas", "venta"] },
  { ruta: "/admin/reposiciones", label: "Reposiciones", palabras: ["reposiciones", "reposicion", "reponer"] },
  { ruta: "/admin/produccion", label: "Producción", palabras: ["produccion", "fabricacion", "ordenes de produccion"] },
  { ruta: "/admin/sabores", label: "Sabores", palabras: ["sabores", "sabor"] },
  { ruta: "/admin/finanzas", label: "Finanzas", palabras: ["finanzas", "cobrar", "cuentas por cobrar", "gastos", "plata", "deudas"] },
  { ruta: "/admin/usuarios", label: "Usuarios", palabras: ["usuarios", "usuario", "personas", "equipo"] },
];

const VERBOS_NAV = ["abre", "abrir", "ir", "ve", "anda", "andate", "vamos", "muestra", "mostrar", "muestrame", "ver", "veamos", "entra", "entrar", "llevame", "lleva", "ir a", "ve a", "abre la", "abre el"];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const NUM: Record<string, number> = {
  cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
  diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
  veinte: 20, veintiuno: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, doscientos: 200, trescientos: 300, cuatrocientos: 400, quinientos: 500, seiscientos: 600, setecientos: 700, ochocientos: 800, novecientos: 900,
  mil: 1000, docena: 12,
};

const DOW: Record<string, number> = { domingo: 0, lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };

const PALABRAS_ORDEN = ["orden", "produccion", "produce", "producir", "produzcan", "fabricar", "fabrica", "fabriquen"];
const PALABRAS_AGENDA = ["agenda", "agendar", "agendame", "apartar", "aparta", "mezclar", "mezcla", "entrega", "entregar"];
const TIPOS_AGENDA: Record<string, string> = { apartar: "apartar", aparta: "apartar", mezclar: "mezclar", mezcla: "mezclar", fabricar: "fabricar", fabrica: "fabricar", entrega: "entrega", entregar: "entrega" };

// Palabras que NO son nombre de producto (verbos, conectores, fechas…).
const RELLENO = new Set([
  "de", "el", "la", "los", "las", "un", "una", "y", "con", "para", "porfavor", "favor", "por",
  "orden", "ordenes", "produccion", "produce", "producir", "fabricar", "fabrica", "fabriquen",
  "agenda", "agendar", "agendame", "apartar", "aparta", "mezclar", "mezcla", "entrega", "entregar",
  "en", "bodega", "hoy", "manana", "pasado", "dia", "hazme", "haz", "quiero", "necesito", "anota", "registra",
]);

function numeroDeTokens(tokens: string[]): number | null {
  let total = 0, current = 0, hubo = false;
  for (const w of tokens) {
    if (w === "y") continue;
    if (/^\d+$/.test(w)) { current += parseInt(w, 10); hubo = true; continue; }
    const v = NUM[w];
    if (v == null) continue;
    hubo = true;
    if (v === 1000) { current = (current === 0 ? 1 : current) * 1000; total += current; current = 0; }
    else current += v;
  }
  return hubo ? total + current : null;
}

/** Extrae la primera "cantidad" (número) y marca los índices usados. */
function extraerCantidad(words: string[]): { valor: number; usados: Set<number> } | null {
  let start = -1, end = -1;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const esNum = /^\d+$/.test(w) || w in NUM || (w === "y" && start >= 0 && (words[i + 1] in NUM || /^\d+$/.test(words[i + 1] ?? "")));
    if (esNum) { if (start < 0) start = i; end = i; }
    else if (start >= 0) break;
  }
  if (start < 0) return null;
  const grupo = words.slice(start, end + 1);
  const valor = numeroDeTokens(grupo);
  if (valor == null) return null;
  const usados = new Set<number>();
  for (let i = start; i <= end; i++) usados.add(i);
  return { valor, usados };
}

/** Fecha del comando (hoy, mañana, pasado mañana, un día de la semana, o "el 25"). */
function extraerFecha(words: string[]): { fecha: Date; usados: Set<number> } {
  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  const usados = new Set<number>();
  const joined = words.join(" ");

  if (joined.includes("pasado manana")) { const d = new Date(hoy); d.setDate(d.getDate() + 2); return { fecha: d, usados }; }
  if (words.includes("manana")) { const d = new Date(hoy); d.setDate(d.getDate() + 1); return { fecha: d, usados }; }

  for (let i = 0; i < words.length; i++) {
    if (words[i] in DOW) {
      const target = DOW[words[i]];
      let diff = (target - hoy.getDay() + 7) % 7;
      if (diff === 0) diff = 7;
      const d = new Date(hoy); d.setDate(d.getDate() + diff);
      usados.add(i);
      return { fecha: d, usados };
    }
  }

  // "el 25" / "para el veinticinco"
  const iEl = words.findIndex((w) => w === "el");
  if (iEl >= 0) {
    const cand = words.slice(iEl + 1, iEl + 3);
    const dia = numeroDeTokens(cand);
    if (dia && dia >= 1 && dia <= 31) {
      let d = new Date(hoy.getFullYear(), hoy.getMonth(), dia, 12);
      if (d < hoy) d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, dia, 12);
      return { fecha: d, usados };
    }
  }

  return { fecha: hoy, usados };
}

function raiz(w: string) { return w.length >= 4 ? w.slice(0, 5).replace(/s$/, "") : w; }
function coincide(a: string, b: string): boolean {
  if (a === b) return true;
  const ra = raiz(a), rb = raiz(b);
  if (ra.length < 3 || rb.length < 3) return a === b;
  return ra === rb || a.startsWith(rb) || b.startsWith(ra);
}

/** Empareja el objetivo (producto o sabor) con los tokens restantes. */
function matchObjetivo(tokens: string[], catalogo: ItemCat[]): ItemCat | null {
  const limpios = tokens.filter((w) => !RELLENO.has(w) && !(w in NUM) && !/^\d+$/.test(w));
  if (limpios.length === 0) return null;
  let mejor: { it: ItemCat; score: number } | null = null;
  for (const it of catalogo) {
    const nomTokens = norm(it.nombre).split(" ").filter((w) => !RELLENO.has(w));
    let score = 0;
    for (const nt of nomTokens) if (limpios.some((l) => coincide(l, nt))) score++;
    if (score > 0 && (!mejor || score > mejor.score)) mejor = { it, score };
  }
  return mejor?.it ?? null;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Detecta un comando de navegación ("abre precios", "ve a inventario"). */
function detectarNavegacion(frase: string, words: string[]): Comando | null {
  const tieneVerboNav = words.some((w) => VERBOS_NAV.includes(w));
  // Solo navega si hay un verbo de navegación (evita chocar con acciones de crear).
  if (!tieneVerboNav) return null;
  // El módulo con la palabra más larga que aparezca en la frase gana (más específico).
  let mejor: { ruta: string; label: string; len: number } | null = null;
  for (const m of MODULOS) {
    for (const p of m.palabras) {
      if (frase.includes(p) && (!mejor || p.length > mejor.len)) mejor = { ruta: m.ruta, label: m.label, len: p.length };
    }
  }
  if (!mejor) return null;
  return { intent: "navegar", ruta: mejor.ruta, label: mejor.label };
}

/** Interpreta la frase dictada y devuelve una acción estructurada. */
export function interpretarComando(texto: string, catalogo: ItemCat[]): Comando {
  const frase = norm(texto);
  const words = frase.split(" ").filter(Boolean);
  if (words.length === 0) return { intent: "desconocido", texto };

  const esAgenda = words.some((w) => PALABRAS_AGENDA.includes(w));
  const esOrden = !esAgenda && words.some((w) => PALABRAS_ORDEN.includes(w));

  // Navegación primero (solo si hay verbo de ir/abrir y no es una orden/agenda).
  if (!esAgenda && !esOrden) {
    const nav = detectarNavegacion(frase, words);
    if (nav) return nav;
  }

  const cant = extraerCantidad(words);
  const restantesTokens = words.filter((_, i) => !cant?.usados.has(i));
  const obj = matchObjetivo(restantesTokens, catalogo);

  if (esOrden) {
    if (!obj || !cant) return { intent: "desconocido", texto };
    return { intent: "orden", clase: obj.clase, refId: obj.id, nombre: obj.nombre, cantidad: cant.valor };
  }

  if (esAgenda) {
    const tipo = words.map((w) => TIPOS_AGENDA[w]).find(Boolean) ?? "otro";
    const { fecha } = extraerFecha(words);
    const partes = [tipo !== "otro" ? tipo[0].toUpperCase() + tipo.slice(1) : "Agenda", cant ? String(cant.valor) : "", obj?.nombre ?? ""].filter(Boolean);
    return {
      intent: "agenda",
      tipo,
      clase: obj?.clase,
      refId: obj?.id,
      nombre: obj?.nombre,
      cantidad: cant?.valor,
      fecha: ymd(fecha),
      titulo: partes.join(" "),
    };
  }

  return { intent: "desconocido", texto };
}
