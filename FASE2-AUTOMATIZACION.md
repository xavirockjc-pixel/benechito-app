# Fase 2 · Automatización (n8n + Evolution API + WhatsApp)

Ecosistema local (a lo Imperio Digital), todo en Docker:

| Servicio | URL | Para qué |
|---|---|---|
| App Next.js | http://localhost:3000 | Landing + CRM |
| **n8n** | http://localhost:5678 | Automatizaciones |
| **Evolution API** | http://localhost:8080 | Puente WhatsApp |
| Evolution Manager | http://localhost:8080/manager | Conectar/administrar WhatsApp |
| Postgres | localhost:5432 | Base de datos |
| Redis | localhost:6379 | Caché/colas |

Levantar todo:
```bash
docker compose up -d
```

## Flujo ya construido y probado ✅

```
Formulario landing → /api/prospectos → guarda en Postgres
                                     └→ webhook n8n (nuevo-prospecto)
                                            └→ Evolution API → WhatsApp de aviso
```

- La app envía cada prospecto a `N8N_WEBHOOK_URL` (ver `.env`).
- El workflow **"Benechito · Nuevo prospecto → WhatsApp"** ya está importado y activo en n8n
  (archivo fuente: `n8n/workflow-nuevo-prospecto.json`).
- Probado end-to-end: la app dispara n8n y n8n llama a Evolution. **Solo falta conectar el número de WhatsApp.**

## Paso pendiente: conectar el WhatsApp (requiere tu teléfono)

1. Abre **http://localhost:8080/manager**
2. Inicia sesión con la API key: `benechito-evo-key-2026`
3. Abre la instancia **benechito** y pulsa **Connect / QR**.
4. En tu teléfono: WhatsApp → *Dispositivos vinculados* → *Vincular dispositivo* → escanea el QR.

> Si el QR se queda "connecting" en bucle, es la conocida incompatibilidad de versión de
> Baileys. Se resuelve fijando `CONFIG_SESSION_PHONE_VERSION` en el servicio `evolution`
> del `docker-compose.yml` con la versión vigente de WhatsApp Web y reiniciando el contenedor.

Una vez conectado, cada nuevo prospecto te llegará por WhatsApp automáticamente.

## Configurar n8n (primera vez)

1. Abre **http://localhost:5678** y crea la cuenta de dueño (email + contraseña).
2. Verás el workflow ya importado. Ábrelo para revisarlo/ajustarlo.
3. El número que recibe los avisos está en el nodo *Enviar WhatsApp*; cámbialo si quieres.

## Próximas automatizaciones (misma arquitectura)

Solo hay que agregar workflows en n8n:
- Recordar **seguimiento** de leads sin contactar (cron + consulta a Postgres).
- Recordar **reposición** cuando `proximaReposicion` vence.
- **Campañas**: nuevos sabores, trufas proteicas, temporada de helados.
- **Reactivar** clientes inactivos.
- Registrar **pedidos** entrantes por WhatsApp (Evolution → n8n → Postgres).

## Datos de conexión (dev)

- Evolution API key: `benechito-evo-key-2026` · instancia: `benechito`
- n8n webhook: `http://localhost:5678/webhook/nuevo-prospecto`
- En el VPS con EasyPanel se replican estos servicios; cambia URLs y llaves por las de producción.

---

## Flujo 2 · Reporte diario automático (socio digital) 🐝

Cada mañana, Benechito te envía por WhatsApp un resumen del negocio (ventas del día por
canal, producción, equipo presente, pedidos/preventa pendientes, por cobrar, caja y stock bajo).

```
Cron n8n (8:00) → GET /api/reporte/diario (app, con token)
                       └→ lee la base y arma el texto
                              └→ Evolution API → WhatsApp (+56 9 6581 3188)
```

**Piezas (ya en el repo):**
- Endpoint: `src/app/api/reporte/diario/route.ts` — devuelve `{ ok, fecha, texto }`. Protegido por `REPORTE_TOKEN`.
- Workflow: `n8n/workflow-reporte-diario.json` — "Benechito · Reporte diario → WhatsApp".

**Activar:**
1. En `.env` define `REPORTE_TOKEN` (mismo valor que usa el workflow).
2. Importa `n8n/workflow-reporte-diario.json` en n8n y actívalo.
3. Ajusta la URL del nodo "Generar reporte" según dónde corre la app:
   - Local (app en el host, n8n en Docker): `http://host.docker.internal:3000/api/reporte/diario`
   - Producción (EasyPanel): la URL interna del servicio de la app.
4. Prueba: en n8n pulsa "Execute workflow" → debe llegar el WhatsApp.

**Probar el reporte sin n8n:** abre en el navegador `http://localhost:3000/api/reporte/diario` (o con `?token=` si lo definiste).
