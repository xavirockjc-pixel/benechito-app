/**
 * Configuración central del sitio Benechito.
 * El número de WhatsApp se toma de la variable de entorno para poder
 * cambiarlo sin tocar el código (y conectarlo luego a Evolution API / n8n).
 */
export const site = {
  nombre: "Benechito",
  tagline: "Productos Artesanales Helados",
  mantra: "Hecho a lo Benechito",
  esencia: "Porque nuestra esencia es hacer bien las cosas",
  promesa: "En Benechito siempre innovaremos",
  direccion: "Río Salado 963, Coronel",
  salaVentas: "Sala de ventas: Manuel Montt 0860",
  coords: "37°00'45.2\"S 73°09'21.4\"W",
  mapsUrl: "https://www.google.com/maps?q=-37.012556,-73.155944",
  web: "benechito.com",
  instagram: "@Benechito_oficial",
  zonaCarbon: "El helado de la Zona del Carbón",
  puntosActivos: 23,

  // Reemplazar por el número real (formato internacional, sin +, sin espacios).
  // Ej. Chile: 56 9 1234 5678  ->  "56912345678"
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "56965813188",

  // Mensaje precargado del CTA de WhatsApp
  whatsappMensaje:
    "¡Hola Benechito! Quiero llevar un Punto Benechito a mi negocio 🙌",
};

/** Construye un enlace wa.me con mensaje precargado. */
export function whatsappLink(mensaje?: string) {
  const texto = encodeURIComponent(mensaje ?? site.whatsappMensaje);
  return `https://wa.me/${site.whatsapp}?text=${texto}`;
}
