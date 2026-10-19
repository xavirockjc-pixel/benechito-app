# 🌐 Publicar Panal en Hostinger (dominio propio)

Para que el cliente abra tus páginas con una **URL pública** (sin cuenta, sin login),
van hospedadas en Hostinger con tu dominio. Esto lo hacemos una vez.

> Regla: el link de Claude (artifact) es **para mostrar tú**; la **URL pública** es
> la que le mandas al cliente.

---

## 1 · Comprar (una vez)
1. En Hostinger, contrata un plan de **Hosting** (el básico/Premium sirve).
2. Elige tu **dominio** (ej. `panal.cl`). Suele venir **gratis el primer año** con el hosting.
3. Hostinger activa el **SSL (candado https) gratis**. Verifica que quede **Activo**
   (en hPanel → SSL). Así tu sitio abre como `https://panal.cl`.

## 2 · Subir la landing
1. Entra a **hPanel → Administrador de archivos**.
2. Abre la carpeta **`public_html`**.
3. Sube el archivo de la **landing** con el nombre **`index.html`**.
4. Listo: `https://panal.cl` muestra tu landing.

## 3 · Subir cada herramienta (en su carpeta)
Dentro de `public_html`, crea una carpeta por producto y sube su archivo como `index.html`:

| Carpeta | Queda en | Qué es |
|---|---|---|
| `menu` | `panal.cl/menu` | Menú QR |
| `agenda` | `panal.cl/agenda` | Agenda de citas |
| `resenas` | `panal.cl/resenas` | Reseñas Google |
| `cotizador` | `panal.cl/cotizador` | Cotizador de Servicios |
| `tienda` | `panal.cl/tienda` | Tienda web |

> El archivo dentro de cada carpeta debe llamarse **`index.html`**.

## 4 · Para cada cliente
Cuando montas a un cliente, su página va en:
- **Subcarpeta:** `panal.cl/dacris` (lo más simple), o
- **Subdominio:** `dacris.panal.cl` (más pro, se crea en hPanel → Subdominios), o
- **Su propio dominio** si él lo compra (lo apuntas a tu hosting).

Ese link es el que le pones en el **QR** (en Menú/Agenda/Reseñas, botón 📱) y el que
le mandas por WhatsApp.

---

## 5 · Cómo preparo yo los archivos
Tú me dices el **dominio** y qué vas a subir, y te dejo **los archivos listos**
(ya con el nombre `index.html` y la marca del cliente si corresponde). Tú solo los
**arrastras** al Administrador de archivos de Hostinger, a su carpeta. En 5 minutos
está online.

Para **actualizar** algo después: reemplazas el archivo por el nuevo (mismo nombre).

---

## Notas
- Los archivos son **autónomos** (HTML): funcionan sin base de datos ni configuración.
- El **QR** y el **envío por WhatsApp** funcionan apenas está en la URL pública.
- Respaldo: guarda cada archivo y su **Config (JSON)** por cliente (ver `RESPALDO.md`).
- La versión con **nube** (ver pedidos/reservas desde varios equipos) es el salto al
  **ecosistema**; Hostinger con archivos sirve perfecto para landing, tienda, menú,
  agenda, reseñas y cotizador.
