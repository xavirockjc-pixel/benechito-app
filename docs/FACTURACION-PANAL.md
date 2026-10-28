# 🧾 Facturación electrónica — Guía de instalación replicable (El Panal)

Procedimiento estándar para activar el **facturador electrónico (boleta 39 / factura 33 del SII)**
en una instalación del sistema Panal (Benechito es el cliente #1 y el modelo). Se repite igual
para cada cliente que contrate el servicio.

## Cómo funciona (arquitectura)

```
Venta (caja / vendedor ruta / panel)
   └─> la app crea DocumentoVenta y avisa por webhook a n8n
         └─> n8n arma el DTE (con el detalle real de productos) y lo emite vía LibreDTE
               └─> LibreDTE firma con el certificado del cliente y lo envía al SII
         └─> n8n devuelve folio + PDF a la app (callback)
   └─> la app muestra folio/PDF en el comprobante y en /admin/facturacion,
       y se envía al cliente final por WhatsApp o email.
```

- El **certificado digital, su contraseña y los folios CAF viven SOLO dentro de LibreDTE**
  (instancia propia por cliente). La app y n8n nunca los ven.
- Si LibreDTE/n8n está caído, la venta NUNCA se pierde: el documento queda "pendiente"
  y se reintenta desde `/admin/facturacion` (botón 🔁).
- Sin emisión automática configurada, el sistema funciona en **modo manual**: se emite en
  la app del SII, se registra el folio en el panel y se envía por WhatsApp igual.

## Checklist — qué debe tener/entregar EL CLIENTE (una vez)

| # | Requisito | Dónde se consigue |
|---|-----------|-------------------|
| 1 | Certificado digital (.pfx/.p12) **+ su contraseña** | E-CertChile, E-Sign, Acepta, etc. (persona autorizada de la empresa) |
| 2 | Estar inscrito como **facturador electrónico** en el SII | sii.cl → Factura electrónica |
| 3 | Si usaba el sistema gratuito del SII: **trámite de cambio a software propio** | sii.cl (el folio sigue la misma numeración) |
| 4 | **Folios CAF** de boleta (39) y factura (33) — primero de **certificación**, luego de producción | sii.cl → Timbraje electrónico |
| 5 | Datos del emisor: RUT, razón social, giro, dirección, comuna, email, **n° y fecha de resolución SII** | El cliente |

> ⚠️ La contraseña del certificado la escribe **el cliente** directamente en la pantalla de
> LibreDTE (nunca se manda por WhatsApp/correo ni se guarda en archivos).

## Instalación en EasyPanel (por cliente, ~30 min)

Convención de nombres: proyecto `facturacion` dentro del proyecto del cliente, o servicios
`libredte` + `libredte-db` junto a su app.

### 1. Base de datos (servicio `libredte-db`)
- EasyPanel → proyecto del cliente → **+ Servicio → MySQL/MariaDB** (imagen `mariadb:11`).
- Variables: `MYSQL_DATABASE=libredte`, `MYSQL_USER=libredte`,
  `MYSQL_PASSWORD=<generar>`, `MYSQL_ROOT_PASSWORD=<generar>`.
- Volumen persistente en `/var/lib/mysql`.

### 2. Aplicación (servicio `libredte`)
⚠️ PROBADO 2026-10-28: la imagen pública `nosagadu/libredte-web-docker` NO existe en
Docker Hub, y la base de datos debe ser **PostgreSQL** (no MariaDB). El método real:
- **+ Servicio → App** con nombre `libredte` → Fuente → pestaña **Dockerfile** → pegar
  el contenido de **`libredte/Dockerfile`** de este repo (construye PHP 7.4 + LibreDTE
  Comunidad rama legacy, con carga automática del esquema al primer arranque).
- Variables (Entorno): `APP_URL=https://<dominio>`, `APP_KEY=base64:<aleatorio>`,
  `DB_HOST=<proyecto>_libredte-pg`, `DB_USERNAME=libredte`, `DB_PASSWORD=<la del paso 1>`,
  `DB_DATABASE=libredte` **y además** (la app legacy lee estas):
  `LIBREDTE_APP_DATABASE_DEFAULT_HOST/PORT/USER/PASS/NAME` con los mismos valores
  (port 5432). Sin estas últimas la app intenta conectarse a localhost y falla el login.
- Volumen persistente en `/var/www/libredte-community/data`.
- El paso 1 debe ser un servicio **Postgres** (imagen `postgres:16`, db/usuario `libredte`).
- Primer ingreso: usuario `admin` clave `admin` → **cambiarla de inmediato**.
- EasyPanel asigna un dominio `*.easypanel.host` automático con SSL; el dominio propio
  (`facturas.<cliente>`) se agrega después en Dominios.

### 3. Dominio + SSL
- Servicio `libredte` → Dominios → agregar `facturas.<dominiodelcliente>` (o
  `libredte.<dominio>`), "Apunta a" = `http://<proyecto>_libredte:80` (**http**, no https).
- En el DNS del cliente: registro A hacia la IP del VPS. EasyPanel saca el SSL solo.

### 4. Configurar LibreDTE (con el cliente presente — 1 vez)
1. Entrar a `https://facturas.<dominio>`, crear el usuario administrador.
2. Registrar la **empresa emisora** (RUT, razón social, giro, dirección, resolución SII).
3. **El cliente** sube su certificado .pfx y escribe su contraseña.
4. Cargar los **CAF de certificación** (39 y 33). Ambiente: **certificación**.
5. Perfil → API → copiar el **HASH** (es la llave que usará n8n).

### 5. n8n (flujo de emisión)
1. Importar `n8n/workflow-facturacion-libredte.json` de este repo.
2. Crear credencial **Basic Auth**: usuario = `<HASH de LibreDTE>`, contraseña vacía.
   Asignarla a los nodos "LibreDTE · emitir" y "LibreDTE · generar".
3. Variables de entorno del n8n:
   - `LIBREDTE_API_URL=https://facturas.<dominio>/api`
   - `LIBREDTE_RUT_EMISOR=<RUT del cliente, ej 76123456-9>`
   - `SII_N8N_WEBHOOK_TOKEN=<generar único por cliente>`
   - `SII_WEBHOOK_TOKEN=<generar único por cliente>`
   - `APP_BASE_URL=https://<dominio de la app del cliente>`
4. Activar el workflow y copiar la URL del webhook.

### 6. App del cliente (variables en EasyPanel → servicio web)
```
SII_N8N_WEBHOOK_URL=<URL del webhook de n8n>
SII_N8N_WEBHOOK_TOKEN=<el mismo del paso 5>
SII_WEBHOOK_TOKEN=<el mismo del paso 5>
```
Redeploy ("Implementar"). El banner de `/admin/facturacion` debe cambiar a
"⚡ Emisión automática CONECTADA".

### 7. Pruebas en certificación (obligatorias)
1. Hacer una **venta de prueba** en la caja (boleta) → debe llegar folio y PDF al panel.
2. Hacer una **factura de prueba** a un cliente con RUT/razón social/giro.
3. Probar el **envío por WhatsApp** del comprobante.
4. Probar un **rechazo** (ej: factura con RUT inválido) → debe aparecer en "Rechazados"
   con su mensaje y reintentarse con 🔁.

### 8. Paso a producción
1. El cliente descarga CAF de **producción** (39 y 33) y los carga en LibreDTE.
2. Cambiar ambiente a **producción** en LibreDTE.
3. Primera boleta/factura real supervisada. ✅ Listo.

## Seguridad (innegociable)
- Una instancia LibreDTE **por cliente** (datos tributarios aislados).
- Tokens de webhook **únicos por cliente** (nunca reutilizar entre clientes).
- Certificado/contraseña/CAF: solo el cliente los manipula, solo viven en su LibreDTE.
- Nada de claves en el repositorio: todo por variables de entorno de EasyPanel.

## Problemas típicos
| Síntoma | Causa probable | Arreglo |
|---|---|---|
| Documento queda "pendiente" para siempre | `SII_N8N_WEBHOOK_URL` mala o workflow inactivo | revisar n8n, luego 🔁 "Reintentar todas" |
| "Rechazado" con mensaje | datos del receptor o CAF agotado | corregir ficha del cliente / cargar más folios, 🔁 |
| Callback 401 | tokens distintos entre n8n y la app | igualar `SII_WEBHOOK_TOKEN` |
| Callback 503 | falta `SII_WEBHOOK_TOKEN` en la app | agregarla y redeploy |
| PDF no llega al WhatsApp | documento sin `urlPdf` público | verificar nodo "generar" y la URL del PDF |
