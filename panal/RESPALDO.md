# 🛟 Panal — Plan de respaldo y continuidad

El objetivo de este documento es simple: **que puedas retomar todo aunque se caiga cualquier
sistema, y sin depender de una sola persona o herramienta** — incluido yo (Claude). Aquí queda
por escrito dónde vive cada cosa y cómo seguir.

> Regla de oro: **nada importante vive en un solo lugar.** Siempre hay una copia que abres tú.

---

## 1. Dónde vive todo (las 3 copias)

| Cosa | Copia principal | Copia de respaldo | Cómo abrirla sin depender de nada |
|---|---|---|---|
| **Kit Panal** (landing, presentación, cotizador, configurador, centro, home) | Repo GitHub `xavirockjc-pixel/benechito-app`, carpeta `panal/` | Los mismos archivos `.html` descargados en tu PC/pendrive | **Doble clic** al `.html` en cualquier navegador — funcionan solos, sin internet ni servidor |
| **La app del negocio** (Benechito y clientes) | Servidor (EasyPanel / VPS) | Respaldo de base de datos `pg_dump` (ver §3) | Se levanta de nuevo desde el repo + el respaldo de datos |
| **Cartera de clientes Panal** (quién, qué módulos, precios) | Centro de Control → guardado en tu navegador | **Archivo `panal-respaldo-AAAA-MM-DD.json`** que descargas | Se vuelve a cargar con “📥 Importar respaldo” en el Centro |
| **Enlaces para compartir** (artifacts) | claude.ai/code/artifacts | Este documento + el repo | Se republican desde los `.html` del repo cuando quieras |

**Si te quedas sin internet o sin cuenta:** los archivos de `panal/` abren con doble clic y siguen
sirviendo para presentar y cotizar. Es tu red de seguridad número uno.

---

## 2. Rutina de respaldo (5 minutos, cada semana o antes de algo importante)

1. **Centro de Control → “💾 Descargar respaldo”.** Guarda el `.json` en 2 sitios (PC + pendrive o Drive).
2. **Repo al día:** confirma que los últimos cambios están en GitHub (rama de trabajo).
   Si trabajas conmigo, yo hago `commit` + `push` — pídeme “sube todo” y queda respaldado.
3. **Base de datos del negocio** (si la app está en producción): saca el `pg_dump` (§3) una vez por
   semana y guárdalo junto al `.json`.

> Con esos 3 archivos (repo + `.json` del centro + `pg_dump`) puedes reconstruir **todo** desde cero.

---

## 3. Respaldo de la app en producción (base de datos)

En el servidor (o donde corra Postgres):

```bash
# EXPORTAR (respaldo)
docker exec -t benechito-postgres pg_dump -U benechito benechito > respaldo.sql

# IMPORTAR (restaurar en una instancia nueva)
docker exec -i benechito-postgres psql -U benechito -d benechito < respaldo.sql
```

Guarda `respaldo.sql` fuera del servidor (tu PC / Drive). Es lo único que no se puede “rehacer solo”.

---

## 4. Cómo retomar si se cae algo (recuperación)

**A. Se cayó el sitio / servidor de la app**
1. Levanta de nuevo el servicio en EasyPanel (o VPS) desde el repo.
2. Restaura la base con el último `respaldo.sql` (§3).
3. Verifica login por rol y que los módulos cargan. Listo.

**B. Perdiste el navegador / cambiaste de PC (cartera de clientes)**
1. Abre `panal/centro.html` (del repo o descargado).
2. “📥 Importar respaldo” → elige tu último `panal-respaldo-*.json`. Vuelve toda tu cartera.

**C. No tienes acceso a claude.ai / a mí**
1. Todo el kit está en el repo y como archivos sueltos: **doble clic** y sigues presentando y cotizando.
2. Para construir una app nueva sin mí: abre el **Configurador** o el **Centro**, copia el
   **“Prompt de construcción”** y pégalo en **cualquier** asistente de IA de programación. El prompt
   es autoexplicativo (no depende de esta conversación).

**D. Se perdió el repo**
1. Reconstruye desde tu carpeta local `panal/` (o el pendrive) → creas repo nuevo y subes.
2. Los `.html` son autónomos: no necesitan build ni dependencias para funcionar.

---

## 5. Cómo trabajamos tú y yo (roles)

- **Tú** decides, vendes y controlas. Usas el **Centro de Control** para registrar clientes y sacar
  cotización, prompt y checklist. Guardas el **respaldo `.json`**.
- **Yo (Claude, tu socio técnico)** programo, ejecuto y despliego: me pasas el **Prompt de
  construcción** por el chat y levanto la app; hago `commit`/`push` y dejo todo versionado.
- **El control siempre es tuyo:** el repo es tuyo, el `.json` es tuyo, los `.html` abren sin mí.
  Si un día no estoy, tienes el prompt, el checklist y los archivos para seguir con cualquiera.

---

## 6. Checklist rápido de “estoy cubierto”

- [ ] Tengo el último `panal-respaldo-*.json` en 2 lugares.
- [ ] El repo está al día (último `push` hecho).
- [ ] Tengo un `respaldo.sql` reciente de la app en producción.
- [ ] Tengo la carpeta `panal/` guardada fuera de internet (pendrive/Drive).
- [ ] Sé abrir `centro.html` y `landing.html` con doble clic.

Si las 5 están ✅, puedes perder cualquier sistema y **retomar en minutos**.
