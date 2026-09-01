-- Extensión Checklists/BPM y Capacitaciones. Migración aditiva.

CREATE TABLE "Formulario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'higiene',
    "rol" TEXT NOT NULL DEFAULT 'todos',
    "frecuencia" TEXT NOT NULL DEFAULT 'diaria',
    "campos" TEXT NOT NULL DEFAULT '[]',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Formulario_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Formulario_rol_idx" ON "Formulario"("rol");
CREATE INDEX "Formulario_activo_idx" ON "Formulario"("activo");

CREATE TABLE "FormularioRespuesta" (
    "id" TEXT NOT NULL,
    "formularioId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT,
    "rol" TEXT,
    "respuestas" TEXT NOT NULL DEFAULT '{}',
    "notas" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormularioRespuesta_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "FormularioRespuesta_formularioId_idx" ON "FormularioRespuesta"("formularioId");
CREATE INDEX "FormularioRespuesta_fecha_idx" ON "FormularioRespuesta"("fecha");

CREATE TABLE "Capacitacion" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL DEFAULT 'fabricacion',
    "urlVideo" TEXT,
    "pasos" TEXT,
    "productoId" TEXT,
    "rol" TEXT NOT NULL DEFAULT 'todos',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Capacitacion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Capacitacion_categoria_idx" ON "Capacitacion"("categoria");
CREATE INDEX "Capacitacion_productoId_idx" ON "Capacitacion"("productoId");

CREATE TABLE "CapacitacionVista" (
    "id" TEXT NOT NULL,
    "capacitacionId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "usuarioNombre" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CapacitacionVista_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CapacitacionVista_capacitacionId_idx" ON "CapacitacionVista"("capacitacionId");

ALTER TABLE "FormularioRespuesta" ADD CONSTRAINT "FormularioRespuesta_formularioId_fkey" FOREIGN KEY ("formularioId") REFERENCES "Formulario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CapacitacionVista" ADD CONSTRAINT "CapacitacionVista_capacitacionId_fkey" FOREIGN KEY ("capacitacionId") REFERENCES "Capacitacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
