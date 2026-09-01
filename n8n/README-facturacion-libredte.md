# Facturación electrónica con LibreDTE — flujo n8n (extensión Panal)

La app ya deja todo enganchado. n8n solo tiene que llamar a LibreDTE, que es quien
firma el DTE con TU certificado y TUS folios (CAF) y lo envía al SII.

## Cómo se dispara (automático)
1. Al cerrar una venta con **boleta** o **factura**, la app crea un `DocumentoVenta`
   (estado `pendiente`) y hace POST a `SII_N8N_WEBHOOK_URL` con TODO lo necesario:
   `documentoId`, `tipo`, `tipoDTE` (39 boleta / 33 factura), montos y datos del
   receptor. Es fire-and-forget: si n8n/LibreDTE está caído, la venta igual se cierra
   y el documento queda pendiente.
2. n8n valida el token, mapea al formato de LibreDTE y hace los **3 pasos** de LibreDTE:
   `emitir` (temporal) → `generar` (real, obtiene folio) → arma la URL del PDF.
3. n8n llama de vuelta a `POST /api/facturacion/callback` con `folio`, `urlPdf` y
   `estado`; la app actualiza el `DocumentoVenta` y sincroniza el campo legacy de la venta.

## Importar el workflow
Importa `workflow-facturacion-libredte.json` en tu n8n de Hostinger. Está `active: false`
a propósito hasta que cargues credenciales y hagas la prueba en certificación.

## Autenticación LibreDTE
LibreDTE autentica con tu **HASH** por HTTP Basic: **usuario = hash, contraseña = X (vacía)**.
Créalo como credencial "HTTP Basic Auth" en n8n y asígnala a los dos nodos HTTP de LibreDTE.

## Variables de entorno
En la app (EasyPanel):
- `SII_N8N_WEBHOOK_URL` — URL del webhook de este workflow (ej: `https://tu-n8n/webhook/facturacion`)
- `SII_N8N_WEBHOOK_TOKEN` — token compartido app → n8n
- `SII_WEBHOOK_TOKEN` — token compartido n8n → app (para `/api/facturacion/callback`)

En n8n:
- `SII_N8N_WEBHOOK_TOKEN`, `SII_WEBHOOK_TOKEN`, `APP_BASE_URL`
- `LIBREDTE_API_URL` — tu LibreDTE self-host (ej: `https://libredte.tudominio.cl/api`) o la nube `https://libredte.cl/api`
- `LIBREDTE_RUT_EMISOR` — RUT del emisor con guión (ej: `76123456-9`)

## Prueba (recomendado por el diseño)
Empieza con **una sola boleta en certificación** de punta a punta. Cuando salga con folio,
replicamos a factura y activamos el envío por email/WhatsApp. El nodo "Mapear a DTE" emite
una línea única ("Venta Benechito"); cuando quieras detalle por producto, se persiste el
detalle de la venta y se mapea aquí (queda anotado como mejora futura).
