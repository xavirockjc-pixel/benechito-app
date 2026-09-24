# 🚀 Runbook de provisión — Da'cris (la app + la central)

Monta una **instancia propia** del sistema para Da'cris (comida rápida, Lota).
Cada cliente tiene su propia instancia = su app por rol + su central + su base de datos.

> **Quién hace qué:** los pasos técnicos (2–7) los ejecuta Claude. Tú solo decides
> hosting, datos y accesos. El dueño solo usa la app y la central.

---

## 0. Qué recibe Da'cris
- **La app (por rol):** cada persona entra con su clave a lo suyo.
  - `caja` → Mostrador: vende comida, abarrotes, caja vecina.
  - `produccion` → Cocina: bandeja de pedidos y preparación.
  - `chofer` → Reparto: entregas con mapa.
  - `propietario` → todo + **la central**.
- **La central (`/admin`):** ventas, caja, deudas, reporte diario a WhatsApp,
  y administración de productos, precios y usuarios.
- El **rubro `comida_rapida`** ya renombra las áreas y **oculta** lo de fábrica
  (producción por litros, recetas por sabor, etc.) — no hay que borrar nada.

---

## 1. Hosting (tú decides una vez)
Dos opciones, ambas con EasyPanel + Postgres:
- **A) Mismo servidor de Benechito** → agregar un servicio nuevo `dacris` (más barato).
- **B) VPS propio de Da'cris** → aislado 100%.

Necesito de ti: acceso a EasyPanel/VPS (o que lo creemos juntos) y, si va con
dominio, apuntar `dacris.tu-dominio.cl`.

## 2. Crear el servicio + base de datos
- En EasyPanel: nuevo servicio **web** desde este repo (rama de producción) y un
  **Postgres** llamado `dacris` (base solo de Da'cris).
- Copia `panal/clientes/dacris-provision.env.example` como **`.env`** del servicio
  y completa `DATABASE_URL`, `AUTH_SECRET`, claves y marca.

## 3. Instalar y migrar
```bash
npm ci
npx prisma migrate deploy      # crea las tablas en la base de Da'cris
npx prisma generate
```

## 4. Cargar los datos de Da'cris (la semilla)
```bash
npm run seed:dacris
```
Esto crea, de forma idempotente:
- Empresa **Da'cris** (rubro comida_rapida) + Sucursal **Lota** + ubicaciones
  (Mostrador, Cocina, Reparto).
- Listas de precio: **Mostrador**, **Web**, **Reparto**.
- **Productos con precio** (referencial): completos, sandwiches, papas, pichangas,
  churros, helados soft, empanadas, panadería, dulces, bebidas, golosinas.
- **Usuarios por rol:** `dueno@dacris.cl` (propietario), `caja@`, `cocina@`, `reparto@`.

> Caja Vecina son **servicios**, no productos: se registran como movimiento/nota en
> la central (no llevan precio de venta). Se pueden agregar como ítems si quieren
> cobrar la comisión.

## 5. Levantar y configurar
```bash
npm run build && npm start        # o "Implementar" en EasyPanel
```
En la central (`/login` con el propietario):
- [ ] Ajustar **precios reales** (Admin → Precios) y **fotos** (Admin → Productos → imágenes).
- [ ] Revisar **usuarios y claves** (cambiar las por defecto).
- [ ] Confirmar **WhatsApp** y horario de acceso.
- [ ] Activar/ocultar lo que corresponda (modo simple ya oculta lo ocasional).

## 6. Probar en el celular
- [ ] Entra a cada rol en un teléfono (caja, cocina, reparto) y haz una venta/pedido de prueba.
- [ ] Confirma que la venta cae en la central y el reporte diario llega a WhatsApp.

## 7. Entregar
- [ ] Pasar accesos al dueño y a cada trabajador (con claves cambiadas).
- [ ] Programar respaldo (`scripts/backup-db.sh` / `pg_dump`) — ver `panal/RESPALDO.md`.

---

## Checklist de "listo para usar"
- [ ] Servicio web + Postgres arriba
- [ ] Migraciones aplicadas
- [ ] `npm run seed:dacris` corrido
- [ ] Precios y fotos reales cargados
- [ ] Claves cambiadas · usuarios por rol probados en celular
- [ ] Reporte diario y WhatsApp funcionando
- [ ] Respaldo programado

Con esto, Da'cris tiene **la app y la central** en vivo.
