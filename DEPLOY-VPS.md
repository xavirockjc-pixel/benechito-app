# Publicar Benechito en internet (benechito.com) — Guía VPS + EasyPanel

Objetivo: pasar de "solo en tu PC" a **https://benechito.com** en línea 24/7, con la
misma arquitectura que ya funciona local (app + Postgres + Redis + n8n + Evolution).

> Los pasos con 💳 requieren tu cuenta y pago; esos los haces tú. El resto lo
> dejo preparado en el código.

---

## Resumen (orden de ejecución)

1. 💳 Comprar el dominio **benechito.com** (a tu nombre).
2. 💳 Contratar un **VPS** (mín. 4 GB RAM recomendado por n8n + Evolution).
3. Instalar **EasyPanel** en el VPS.
4. Apuntar el **DNS** de benechito.com al VPS.
5. Desplegar los servicios en EasyPanel (Postgres, Redis, n8n, Evolution, App).
6. EasyPanel activa **HTTPS** solo.
7. Reconectar el **WhatsApp** (escanear QR de nuevo, una vez).

---

## 1. 💳 Dominio
Compra **benechito.com** en cualquier registrador (Namecheap, GoDaddy, o el mismo
Hostinger). **Regístralo a tu nombre/RUT.** (~US$10–12/año)

## 2. 💳 VPS
Contrata un VPS Linux (Ubuntu 22/24). Sugerido para este stack:
- **4 GB RAM / 2 vCPU** mínimo cómodo (n8n + Evolution + Postgres + app).
- Ej.: Hostinger VPS, Contabo, DigitalOcean, Hetzner. (~US$6–12/mes)
- Anota la **IP pública** del VPS.

## 3. Instalar EasyPanel
Conéctate al VPS por SSH y ejecuta (lo indica su web oficial):
```bash
curl -sSL https://get.easypanel.io | sh
```
Luego entra a `http://IP-DEL-VPS:3000` y crea tu cuenta de EasyPanel.

## 4. DNS → VPS
En el panel de tu dominio, crea estos registros **A** apuntando a la IP del VPS:

| Tipo | Nombre | Valor |
|---|---|---|
| A | `@` | IP-DEL-VPS |
| A | `www` | IP-DEL-VPS |
| A | `n8n` | IP-DEL-VPS |
| A | `evo` | IP-DEL-VPS |

(Los subdominios n8n.benechito.com y evo.benechito.com son para administrar esas
herramientas.)

## 5. Desplegar los servicios en EasyPanel
Crea un **proyecto** "benechito" y dentro agrega los servicios. EasyPanel tiene
plantillas de 1 clic para varios:

1. **Postgres** (plantilla) → user `benechito`, pass fuerte, db `benechito`. Crea también la db `evolution`.
2. **Redis** (plantilla).
3. **n8n** (plantilla) → dominio `n8n.benechito.com`.
4. **Evolution API** (plantilla) → dominio `evo.benechito.com`. Variables:
   - `AUTHENTICATION_API_KEY` = (una llave larga y secreta)
   - `DATABASE_CONNECTION_URI` = postgres interno + db `evolution`
   - `CACHE_REDIS_URI` = redis interno
   - `CONFIG_SESSION_PHONE_VERSION` = 2.3000.1043857760 (o la vigente)
5. **App Benechito** (este proyecto):
   - Fuente: tu repo de GitHub (sube el código) → EasyPanel construye con el `Dockerfile` incluido.
   - Dominio: `benechito.com` (y www).
   - Puerto: `3000`.
   - Variables de entorno (ver abajo).

### Variables de entorno de la App (producción)
```
DATABASE_URL=postgresql://benechito:PASS@<postgres-interno>:5432/benechito?schema=public
AUTH_SECRET=<cadena larga aleatoria>
NEXT_PUBLIC_WHATSAPP=56965813188
N8N_WEBHOOK_URL=http://<n8n-interno>:5678/webhook/nuevo-prospecto
SEED_ADMIN_EMAIL=admin@benechito.cl
SEED_ADMIN_PASSWORD=<contraseña fuerte>
SEED_ADMIN_NOMBRE=Equipo Benechito
```
`<postgres-interno>` y `<n8n-interno>` son los nombres internos que EasyPanel asigna
a esos servicios (los ves en el panel).

### Primera carga de datos
Tras el primer deploy, abre la **terminal** del servicio App en EasyPanel y corre una vez:
```bash
npm run seed
```
(Las migraciones se aplican solas en cada arranque vía el entrypoint.)

## 6. HTTPS
EasyPanel emite el certificado **Let's Encrypt** automáticamente al asignar el dominio.
Tu sitio queda en **https://benechito.com** con candado.

## 7. Reconectar WhatsApp (una vez)
1. Entra a `https://evo.benechito.com/manager` con tu `AUTHENTICATION_API_KEY`.
2. Crea la instancia `benechito` y escanea el QR **en vivo** con tu teléfono.
3. En n8n (`https://n8n.benechito.com`) revisa el workflow "Nuevo prospecto → WhatsApp"
   (impórtalo desde `n8n/workflow-nuevo-prospecto.json` si no está) y actívalo.
   Ajusta la URL de Evolution del nodo a `http://<evolution-interno>:8080`.

---

## Alternativa más simple (solo la landing, sin automatización)
Si por ahora solo quieres la **web pública** (sin n8n/WhatsApp en el servidor),
puedes desplegar únicamente la App + Postgres en EasyPanel, o incluso usar Vercel
para el front. Pero para el WhatsApp automático 24/7 necesitas el VPS.

## Costo aproximado mensual
- Dominio: ~US$1/mes (pago anual)
- VPS 4 GB: ~US$6–12/mes
- **Total: ~US$7–13/mes**
