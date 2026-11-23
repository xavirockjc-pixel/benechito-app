-- Copa Garza (vaso/copa, por unidad) para que el bodeguero la agregue por voz.
INSERT INTO "Producto" ("id","linea","nombre","formato","tipo","seccion","activo","soloLocal","publicarTienda","unidadesPack")
VALUES ('prod_copa_garza','helado','Copa Garza','unidad','propio','propio',true,false,false,NULL)
ON CONFLICT ("id") DO NOTHING;

-- Balde 5 litros: asegurar que exista (por si no corrió la migración de ruta).
INSERT INTO "Producto" ("id","linea","nombre","formato","tipo","seccion","activo","soloLocal","publicarTienda","unidadesPack")
VALUES ('prod_ruta_balde5','helado','Balde 5 litros','Balde 5 L','propio','ruta',true,false,false,NULL)
ON CONFLICT ("id") DO NOTHING;

-- Caja de dinero recibido en bodega/fábrica (ventas directas), con cierre.
CREATE TABLE IF NOT EXISTS "DineroBodega" (
  "id" TEXT PRIMARY KEY,
  "monto" DECIMAL(12,2) NOT NULL,
  "concepto" TEXT,
  "contraparte" TEXT,
  "cerrado" BOOLEAN NOT NULL DEFAULT false,
  "usuarioId" TEXT,
  "nombreUsuario" TEXT,
  "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cerradoEn" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "DineroBodega_fecha_idx" ON "DineroBodega"("fecha");
CREATE INDEX IF NOT EXISTS "DineroBodega_cerrado_idx" ON "DineroBodega"("cerrado");
