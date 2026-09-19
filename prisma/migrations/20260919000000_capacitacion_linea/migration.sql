-- Área/producto de cada capacitación (para pestañas por producto en la app).
ALTER TABLE "Capacitacion" ADD COLUMN "linea" TEXT;
CREATE INDEX "Capacitacion_linea_idx" ON "Capacitacion"("linea");

-- Etiqueta las capacitaciones de calidad por su producto; el resto queda general (null).
UPDATE "Capacitacion" SET "linea" = 'tuyyo'   WHERE "id" = 'cap_calidad_helados';
UPDATE "Capacitacion" SET "linea" = 'cremas'  WHERE "id" = 'cap_calidad_cremas';
UPDATE "Capacitacion" SET "linea" = 'trufas'  WHERE "id" = 'cap_calidad_trufas';
UPDATE "Capacitacion" SET "linea" = 'cuchufli' WHERE "id" = 'cap_calidad_cuchufli';
