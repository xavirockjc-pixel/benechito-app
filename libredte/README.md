# LibreDTE auto-hospedado (Hostinger) — guía de montaje

Esto NO lo puedo desplegar por ti (es tu servidor y tus credenciales del SII), pero acá
queda todo listo para que lo levantes y lo pruebes tú.

## Qué es
LibreDTE Edición Comunidad: app web open source que emite DTEs reales al SII usando tu
**certificado digital** y tus **folios (CAF)**. Expone una API que tu n8n ya sabe llamar.

## Opción rápida (sin self-host)
Si montar el stack completo te complica, puedes apuntar `LIBREDTE_API_URL` a la nube
`https://libredte.cl/api` (mismo API, mismos 3 pasos). Cambias solo esa variable; el resto
del cableado es idéntico.

## Self-host en tu Hostinger
1. Repositorio oficial (Edición Comunidad): https://github.com/LibreDTE/libredte-app-community
   Imagen Docker comunitaria de referencia: https://github.com/nosagadu/libredte-web-docker
2. Levanta el contenedor (ver `docker-compose.yml` de esta carpeta como base) junto a tu n8n.
3. Entra a la web de LibreDTE y configura:
   - Tu **empresa/emisor** (RUT, giro, dirección).
   - Sube tu **certificado digital** (.pfx/.p12) y su clave.
   - Carga tus **CAF** (folios) para boleta (39) y factura (33), primero de **certificación**.
   - Copia tu **HASH** de API (Perfil → API) para usarlo en n8n (Basic Auth: usuario=hash).
4. Pon `LIBREDTE_API_URL` = `https://libredte.tudominio.cl/api` en la app y en n8n.

## Ambiente
Prueba primero en **certificación** del SII. Cuando la primera boleta salga con folio,
cambias a **producción** en LibreDTE.

> ⚠️ El certificado, la clave y los CAF los cargas tú directamente en LibreDTE. La app y
> n8n nunca los ven ni los guardan.
