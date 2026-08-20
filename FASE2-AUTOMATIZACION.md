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
