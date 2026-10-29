// Atajo a la app oficial SII e-Factura (emisión manual de facturas).
// En Android abre la app instalada (o Play Store si falta); en iOS/PC abre la web del SII.

export const EFACTURA_PKG = "cl.sii.FacturaElectronica";
export const EFACTURA_PLAY = `https://play.google.com/store/apps/details?id=${EFACTURA_PKG}`;
export const EFACTURA_INTENT = `intent://#Intent;package=${EFACTURA_PKG};S.browser_fallback_url=${encodeURIComponent(EFACTURA_PLAY)};end`;
/** Facturador gratuito del SII (web) — sección Factura electrónica. */
export const SII_WEB = "https://www.sii.cl/servicios_online/1039-.html";

/** Abre la app e-Factura en Android, o la web del SII en iOS/escritorio. */
export function abrirEfactura(webUrl: string = SII_WEB) {
  if (typeof navigator === "undefined") return;
  const esAndroid = /Android/i.test(navigator.userAgent || "");
  if (esAndroid) window.location.href = EFACTURA_INTENT;
  else window.open(webUrl, "_blank", "noopener,noreferrer");
}
