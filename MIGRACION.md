# 🚚 Migrar el ecosistema Benechito a otro PC / usuario

Guía paso a paso para dejar el proyecto funcionando en **otra computadora**. Es la copia de
**desarrollo** (donde se programa y prueba). **La app publicada que usa tu equipo sigue en el
servidor (VPS + EasyPanel) y no se toca** — esto es solo tu "taller" en otro PC.

> **Lo que se migra:** el código (desde GitHub), los secretos (`.env`), la base de datos local
> (opcional) y la landing de Panal. Tiempo estimado: 20–30 min.

---

## 0. Lo que necesitas tener a mano
- La cuenta de **GitHub** con acceso al repositorio (usuario `xavirockjc-pixel`).
- El archivo **`.env`** (te lo envié aparte — trae claves, NO se sube a GitHub).
- El archivo **`panal.html`** (la landing de Panal).

---

## 1. Instalar los 3 programas base (una sola vez en el PC nuevo)

1. **Git** — https://git-scm.com/download/win (siguiente, siguiente, instalar).
2. **Node.js LTS** — https://nodejs.org (versión LTS, la recomendada).
3. **Docker Desktop** — https://www.docker.com/products/docker-desktop (para la base de datos local).
   Al terminar, **abre Docker Desktop** y déjalo corriendo.

Para comprobar que quedaron, abre **PowerShell** y escribe:
```bash
git --version
node -v
docker --version
```
Si cada uno responde con un número de versión, vas bien. ✅

---

## 2. Descargar el código desde GitHub

Elige una carpeta (ej. el Escritorio) y en PowerShell:
```bash
cd Desktop
git clone https://github.com/xavirockjc-pixel/benechito-app.git
cd benechito-app
```
> La primera vez GitHub te pedirá iniciar sesión: usa tu cuenta `xavirockjc-pixel`.

---

## 3. Poner los secretos (`.env`)

Copia el archivo **`.env`** que te envié **dentro de la carpeta `benechito-app`** (al lado de
`package.json`). Sin este archivo la app no arranca. **Nunca lo subas a GitHub.**

---

## 4. Instalar las dependencias
```bash
npm install
```

---

## 5. Levantar la base de datos local (Docker)

Con Docker Desktop abierto:
```bash
docker compose up -d postgres
```
Eso enciende PostgreSQL en el puerto 5432 (usuario/clave/nombre: `benechito`).
*(Si también quieres n8n y Evolution para WhatsApp, usa `docker compose up -d` sin el `postgres`.)*

---

## 6. Preparar la base y crear los usuarios
```bash
npx prisma migrate deploy
npx prisma generate
npm run seed
```
- `migrate deploy` crea todas las tablas (56 migraciones).
- `seed` crea los usuarios de arranque (admin, vendedor, caja, bodega, producción) — todos con
  clave `benechito123`.

---

## 7. Arrancar la app
```bash
npm run dev
```
Abre el navegador en **http://localhost:3000** → entra por `/login` con `admin@benechito.com`
y la clave `benechito123`. 🎉

---

## 8. La landing de Panal

El archivo **`panal.html`** es autónomo: **ábrelo con doble clic** en cualquier navegador para verlo.
Para publicarlo online otra vez (link para compartir), lo republicas desde Claude o lo subes a
cualquier hosting estático (Netlify, Vercel, tu cPanel).

---

## 9. Migrar los datos actuales (OPCIONAL)

Los datos **reales** de tu operación viven en el **servidor (VPS)**, no en tu PC. Si además quieres
copiar los datos de prueba de tu PC viejo al nuevo:

**En el PC viejo** (exportar):
```bash
docker exec -t benechito-postgres pg_dump -U benechito benechito > respaldo.sql
```
Copia `respaldo.sql` al PC nuevo (dentro de `benechito-app`) y **ahí** (importar):
```bash
docker exec -i benechito-postgres psql -U benechito -d benechito < respaldo.sql
```

---

## Para seguir trabajando y publicar cambios

- **Guardar y subir** cambios a GitHub:
  ```bash
  git add -A
  git commit -m "descripción del cambio"
  git push
  ```
- **Publicar a producción** (lo que usa tu equipo): EasyPanel → servicio `web` → **"Implementar"**.

---

## Resumen ultra-corto (para alguien con experiencia)
```bash
git clone https://github.com/xavirockjc-pixel/benechito-app.git
cd benechito-app
# copiar .env aquí
npm install
docker compose up -d postgres
npx prisma migrate deploy && npx prisma generate && npm run seed
npm run dev   # http://localhost:3000
```

---

*Datos del proyecto: Next.js 16 + Prisma + PostgreSQL. Repo: github.com/xavirockjc-pixel/benechito-app
(rama `main`). Producción: VPS Hostinger + EasyPanel (servicio `web`). Ver también
ECOSISTEMA-BENECHITO.md.*
