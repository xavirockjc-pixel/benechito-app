# Estado del ecosistema Benechito — handoff para continuar

> Documento para retomar el trabajo desde otro PC / la cuenta Benechito.
> Última actualización: 2026-11-01.

## 1. Cómo continuar en una sesión nueva de Claude
1. Clona/actualiza el repo en el PC nuevo:
   ```bash
   git clone https://github.com/xavirockjc-pixel/benechito-app.git
   # o si ya está:  git pull
   ```
2. Abre Claude Code en la carpeta del repo y dile: **"lee `docs/ESTADO-BENECHITO.md` y continúa"**.
3. Para desplegar cambios: `git push` y luego en **EasyPanel → benechito → web → Implementar** (las migraciones Prisma se aplican solas al arrancar).

**Todo el trabajo está en GitHub** (`origin`), ese es el respaldo. La "memoria" de Claude es local de cada PC y NO viaja — por eso existe este documento.

## 2. Infraestructura (EasyPanel · VPS 195.200.5.103:3000)
Proyecto EasyPanel **benechito**, servicios:
- **web** — la app Next.js (este repo). Deploy = push + Implementar.
- **db** (postgres) — base de datos de la app.
- **libredte** + **libredte-pg** — facturación electrónica automática (instalada, en pausa; ver §5).
- **evolution-api** + **evolution-api-db** + **evolution-api-redis** — WhatsApp central (ver §4).

Variables importantes del servicio **web** (EasyPanel → web → Entorno): `DATABASE_URL`, `EVOLUTION_API_URL/KEY/INSTANCE` (WhatsApp), `NEXT_PUBLIC_WHATSAPP`. Opcionales no configuradas aún: `NOTIF_LOCAL_WHATSAPP`, `NOTIF_VENDEDOR_WHATSAPP`, `TELEGRAM_BOT_TOKEN` (hoy es placeholder), `SII_N8N_WEBHOOK_URL` (activa factura automática).

## 3. Apps del ecosistema
- **/caja** (local) · **/vendedor** (ruta) · **/bodega** · **/produccion** · **/admin** (cerebro/panel) · **/tienda** (web pública).

## 4. WhatsApp central (Evolution) — EN VIVO
Todo (comprobantes, facturas, mensaje masivo) sale desde UN número Benechito **56965813188**, del servidor, no del teléfono de cada quien.
- Evolution: `https://benechito-evolution-api.jfrmjq.easypanel.host` · Manager en `/manager`.
- Instancia WhatsApp: **benechito** (canal Baileys). Estado `open` (conectado).
- La **API key** NO se guarda aquí por seguridad: está en EasyPanel → servicio **evolution-api** → Entorno (`AUTHENTICATION_API_KEY`) y en **web** → Entorno (`EVOLUTION_API_KEY`).
- Código: `src/lib/whatsapp.ts` (`enviarWhatsApp` → sendText / sendMedia).
- Si se desconecta: Manager → instancia benechito → Get QR / vincular por número.

## 5. Facturación electrónica (DTE / SII)
- **Modo manual ACTIVO** hoy: la app arma la factura; se emite a mano en la app **SII e-Factura**; en el panel/vendedor se registra el folio y se envía al cliente.
- Pantallas: Vendedor **Por facturar** (`/vendedor/facturar`), **Factura rápida** (`/vendedor/factura-rapida`), Panel **Facturación** (`/admin/facturacion`).
- **Envío al cliente solo si se adjunta el documento** (PDF/foto); sin documento solo marca.
- **Automático (Camino A, en pausa):** LibreDTE ya instalado. Falta: folios CAF (boleta 39 / factura 33) + certificación del SII + conectar (HASH de LibreDTE + vars `SII_N8N_WEBHOOK_URL/_TOKEN`). Certificado .pfx (RUT 15.962.826-4) ya cargado en LibreDTE; respaldo en `C:\Users\ACER\Downloads\15962826-4.pfx`.

## 6. Lo construido recientemente (resumen)
- **Facturación**: en las 3 apps; comprobante con netos; factura rápida a mano; aviso al cliente con documento.
- **Precios ruta por zona** (bolsa 50 / pack 16) corregidos (eran por unidad → se multiplicaban).
- **Clientes/rutas** del vendedor: rutas canónicas (unen comunas), editor de cliente, prospectos con color + auto-pase a ruta, mensaje masivo central.
- **Pedidos online** (tienda → app): la app **suena** al entrar un pedido (campana + WakeLock), ciclo confirmar→preparar→listo→entregar, routing local (retiro/moto) vs vendedor (reparto), avisos al cliente por WhatsApp. El cliente deja su WhatsApp en el checkout (obligatorio).
- **Insumos / materias primas** (modelo `MateriaPrima`): sembrados (leche, azúcar, estabilizante, edulcorante, esencias, colorante, palitos, bolsas). Producción: conteo "cuánto queda" por selector + registrar **baldes/mezclas** (insumos opcionales). Bodega: buscador por voz (cuándo llegó + cuánto queda), por sector retráctil, movimientos por día. Cerebro (`/admin/materias`): pronóstico de duración + aviso "va a faltar". **Se deja APRENDIENDO** (sin recetas estándar aún).
- **Producción**: home solo "lo del día"; **calendario** (`/produccion/registro`) día/semana/mes con quién fabricó cuántos (para pagos); editar/borrar registros (revierte stock).
- **Inventario** (`/admin/inventario`): separado por ubicación (Local / Fábrica-Bodega / Camión) en ventanas retráctiles, solo lo con stock. Migración que reinició el stock de Local a 0 y corrigió negativos.

## 7. Pendientes / decisiones abiertas
- Activar factura **automática** (LibreDTE) cuando se haga la certificación del SII + folios CAF.
- Configurar `NOTIF_LOCAL_WHATSAPP` / `NOTIF_VENDEDOR_WHATSAPP` si se quiere separar avisos por encargado.
- `TELEGRAM_BOT_TOKEN` real (hoy placeholder) si se quieren avisos internos por Telegram.
- Insumos: cargar **recetas estándar por balde** cuando se quiera cálculo exacto (hoy aprende solo).
- Número Benechito dedicado (hoy usa el personal de Xavier 56965813188).
