# 🚀 Actualizar producción (benechito.com) — con lo nuevo

Novedades a subir: **tabla de stock editable**, **recordatorios**, **reporte diario** y
**mejoras y proyecciones**. Todo ya está en GitHub (rama `main`) y el build de producción
pasa. Sigue estos pasos en tu servidor.

> ✅ Ya hecho por Claude: código en GitHub, build verificado, migraciones listas
> (se aplican solas en el arranque vía `docker-entrypoint.sh`).

---

## 1. Redesplegar la app (EasyPanel)
1. Entra a EasyPanel → proyecto **benechito** → servicio de la **App**.
2. Pulsa **Implementar / Redeploy** (toma el último commit de GitHub `main` y reconstruye).
3. Al arrancar, el entrypoint corre `prisma migrate deploy` → aplica la migración nueva
   (`mejoras_proyecciones`) y cualquier otra pendiente, sin borrar datos.

## 2. Variable de entorno nueva
En el servicio App (EasyPanel → Environment), agrega:
```
REPORTE_TOKEN=benechito-reporte-2026
```
Guarda y vuelve a desplegar (para que tome la variable). Protege los endpoints
`/api/reporte/diario` y `/api/recordatorios`.

## 3. Verificar en el sitio
Abre **https://benechito.com/admin** y revisa:
- **Inventario** → la **tabla editable** (escribe cantidades y Guardar) + ajuste por voz.
- **Mejoras y proyecciones** (menú Inicio → 🚀) — dictar por voz.
- **Recordatorios** (menú Inicio → 🔔) — botones de WhatsApp.

> 💡 Configurar el stock por primera vez: Inventario → escribe la cantidad real de
> cada producto en cada ubicación → Guardar.

## 4. Activar los avisos automáticos por WhatsApp (n8n)
1. Entra a **n8n** (n8n.benechito.com) → **Import from File** y sube:
   - `n8n/workflow-reporte-diario.json` (reporte cada día 8:00)
   - `n8n/workflow-recordatorios.json` (recordatorios Lun–Sáb 9:00)
2. En cada uno, abre el nodo **"Generar reporte / Calcular recordatorios"** y cambia la URL:
   - De `http://host.docker.internal:3000/...`
   - A la **URL interna de la app en EasyPanel** (el nombre del servicio), por ej.
     `http://<nombre-servicio-app>:3000/api/reporte/diario` y `.../api/recordatorios`
   - Verifica que el parámetro `token` = `benechito-reporte-2026` (igual que el .env).
3. Verifica el nodo **Evolution**: `apikey` y `number` (tu WhatsApp 56965813188) correctos.
4. **Activa** ambos workflows (toggle Active).
5. Si el WhatsApp no está conectado: Evolution Manager (evo.benechito.com/manager) →
   instancia **benechito** → Connect / QR → escanéalo con tu teléfono (una sola vez).

## 5. Probar el envío ahora
- En n8n, abre un workflow y pulsa **Execute workflow** → debe llegarte el WhatsApp.
- O prueba el endpoint: `https://benechito.com/api/reporte/diario?token=benechito-reporte-2026`

---

## Resumen: qué hace cada quién
| Paso | Quién |
|---|---|
| Código, build, migraciones listas | ✅ Claude (hecho) |
| Redeploy en EasyPanel | Tú |
| Agregar `REPORTE_TOKEN` | Tú |
| Importar/activar workflows n8n + URL interna | Tú |
| Conectar WhatsApp (QR) si hace falta | Tú (tu teléfono) |

---

## 🕒 Zona horaria (fecha y hora correctas)

El sistema debe mostrar la **hora de Chile**. Viene fijada en la imagen
(`TZ=America/Santiago`), así que normalmente **no hay que hacer nada** — solo
que EasyPanel **reconstruya** al implementar (un redeploy normal lo hace).

### Dónde revisarla
- **Fácil (en la app):** crea una **nota** y mira su hora (🕒), o abre
  `https://benechito.com/api/reporte/diario?token=benechito-reporte-2026`
  y revisa la hora de los recordatorios. Si coincide con tu celular → OK.
- **En EasyPanel:** proyecto **benechito** → servicio **App** → **Environment**
  → busca la variable **`TZ`**.
  - Si **no aparece**: la zona ya viene fija (`America/Santiago`). Nada que hacer.
  - Si **aparece con otro valor** (`UTC`, `Etc/UTC`…): esa manda por encima.
    Cámbiala a **`America/Santiago`**, guarda y vuelve a **Implementar**.

> Si tras implementar la hora sigue +3/+4, casi seguro hay un `TZ` por fuera en
> Environment (paso de arriba). Corrígelo ahí.
