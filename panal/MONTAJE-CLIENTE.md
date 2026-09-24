# 🏗️ Montaje de un cliente nuevo — un cliente = un proyecto independiente

Modelo: **el código actual es el "molde" (la fábrica).** Cada cliente tiene **su
propio proyecto**: su repositorio, su base de datos y su dirección web. **Nada se
mezcla** — si un cliente cambia algo o se cae, no afecta a los demás.

> **Reparto de roles:** lo técnico (crear repo, deploy, seed, updates, respaldo)
> lo hace Claude. Tú vendes y **actualizas contenido** (productos, precios, fotos)
> desde la **central** de cada cliente — sin tocar código.

---

## Cómo se reutiliza el molde (sin mezclar)
- El **molde** = este repositorio (el motor). No opera clientes; es de donde nacen.
- Cada **cliente** = una **copia independiente** del molde (su repo) + su base de
  datos + su deploy. Independiente 100%.
- Para pasar una **mejora del molde** a un cliente: se agrega el molde como
  "origen de mejoras" (git remote) y se trae el cambio **solo a ese cliente**,
  cuando el cliente quiera. Nunca automático, nunca cruzado.

---

## Provisión de un cliente (lo repetible)
Cada cliente vive en **un archivo de config**: `prisma/clientes/<slug>.json`
(mira `dacris.json` de ejemplo). Trae empresa, rubro, sucursal, ubicaciones,
listas de precio, usuarios por rol y catálogo con precios.

### Pasos (los ejecuta Claude)
1. **Crear el proyecto del cliente**: nuevo repo copiado del molde + su archivo
   `prisma/clientes/<slug>.json` (branding y catálogo del cliente).
2. **Hosting**: un servicio web + un Postgres **solo de ese cliente** (EasyPanel/VPS).
   Copiar `.env` (ver `panal/clientes/*-provision.env.example`).
3. **Instalar y migrar**:
   ```bash
   npm ci && npx prisma migrate deploy && npx prisma generate
   ```
4. **Cargar los datos del cliente**:
   ```bash
   CLIENTE=<slug> npm run seed:cliente
   ```
   (crea empresa, sucursal, listas, productos con precio y usuarios por rol).
5. **Levantar y configurar** en la central (`/login` con el propietario): precios
   y fotos reales, cambiar claves, confirmar WhatsApp y horarios.
6. **Probar en el celular** de cada rol y **entregar** accesos.
7. **Respaldo** programado (`scripts/backup-db.sh` / `pg_dump`) — ver `panal/RESPALDO.md`.

### Rubros disponibles (renombran áreas y ocultan módulos solos)
`comida_rapida` · `panaderia` · `restaurante` · `fabrica`
(se define en `empresa.rubro` del JSON del cliente).

---

## Tu día a día (sin tocar código)
- **Vender**: usa el Cotizador / la presentación / la landing de Panal.
- **Actualizar**: entra a la **central del cliente** y cambias productos, precios,
  fotos, usuarios. Se ve al instante para ese cliente, sin afectar a nadie más.
- Si necesitas algo nuevo o una mejora del molde: me dices y yo la aplico a los
  clientes que elijas.

---

## Clientes montados
| Cliente | Config | Rubro | Estado |
|---|---|---|---|
| Da'cris (Lota) | `prisma/clientes/dacris.json` | comida_rapida | listo para deploy — falta hosting |

> Para un cliente nuevo: duplica un JSON de `prisma/clientes/`, cámbialo, y
> `CLIENTE=<slug> npm run seed:cliente`.
