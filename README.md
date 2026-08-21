# Benechito · Landing + CRM

Landing de captación y sistema simple de gestión comercial para los **Puntos Benechito**
(góndolas doradas con dulces artesanales para compra por impulso).

Stack: **Next.js 16 + React 19 + Tailwind v4 + Prisma**. Preparado para el stack
Imperio Digital (Postgres/Supabase + n8n + Evolution API + Redis en VPS/EasyPanel).

## Cómo correrlo (local)

```bash
npm install
npx prisma migrate dev      # crea la base SQLite
npm run seed                # carga productos, admin y ejemplos
npm run dev                 # http://localhost:3000
```

- **Landing:** http://localhost:3000
- **Administración:** http://localhost:3000/admin
- **Login:** http://localhost:3000/login
  - Usuario: `admin@benechito.com` · Contraseña: `benechito123` (cambiar en `.env`)

## Estructura

```
src/
  app/
    page.tsx              Landing (10 secciones)
    api/prospectos/       API del formulario (guarda + gancho n8n)
    login/                Login del equipo
    panel/                CRM protegido
      page.tsx            Dashboard (KPIs, embudo)
      negocios/           Lista, ficha, alta manual
      reposiciones/       Reposiciones pendientes/programadas
      productos/          Catálogo
  components/             Secciones de la landing + formulario
  lib/
    benechito.ts          Contenido de marca (sabores, cuchuflís...)
    config.ts             Config del sitio + WhatsApp
    estados.ts            Estados del embudo comercial
    prisma.ts             Cliente Prisma
    auth.ts               Sesión (JWT/cookie)
  proxy.ts                Protege /admin
prisma/
  schema.prisma           Modelo de datos
  seed.mjs                Carga inicial
docker-compose.yml        Postgres + Redis (para migrar desde SQLite)
```

## Datos que faltan por completar

- **Número de WhatsApp real:** en `.env` → `NEXT_PUBLIC_WHATSAPP` (formato `569XXXXXXXX`).
- **Logo oficial** (PNG/SVG) en `/public` → reemplazar el wordmark en `src/components/Logo.tsx`.
- **Fotos reales** (góndola en negocios, vendedor, packaging) en `/public/fotos`.

## Camino a producción (Imperio Digital)

1. Instalar Docker Desktop (requiere WSL2 + reinicio).
2. `docker compose up -d` (Postgres + Redis).
3. En `schema.prisma`, `provider = "postgresql"`; en `.env`, `DATABASE_URL` de Postgres.
4. `npx prisma migrate dev && npm run seed`.
5. Desplegar en VPS con EasyPanel; sumar n8n + Evolution API para WhatsApp.

El API del formulario ya deja el **gancho** listo: define `N8N_WEBHOOK_URL` en el
entorno y cada nuevo prospecto se notifica a n8n automáticamente.
