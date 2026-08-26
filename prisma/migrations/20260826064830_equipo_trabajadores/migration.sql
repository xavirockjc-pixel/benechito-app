-- CreateTable
CREATE TABLE "Trabajador" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT NOT NULL DEFAULT 'operario',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "usuarioId" TEXT,
    "valorHora" DECIMAL(12,2),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trabajador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asistencia" (
    "id" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "presente" BOOLEAN NOT NULL DEFAULT true,
    "horas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "horasExtra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notas" TEXT,

    CONSTRAINT "Asistencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoTrabajador" (
    "id" TEXT NOT NULL,
    "trabajadorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "horas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notas" TEXT,
    "usuarioId" TEXT,
    "nombreUsuario" TEXT,

    CONSTRAINT "MovimientoTrabajador_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trabajador_cargo_idx" ON "Trabajador"("cargo");

-- CreateIndex
CREATE INDEX "Asistencia_trabajadorId_idx" ON "Asistencia"("trabajadorId");

-- CreateIndex
CREATE INDEX "Asistencia_fecha_idx" ON "Asistencia"("fecha");

-- CreateIndex
CREATE INDEX "MovimientoTrabajador_trabajadorId_idx" ON "MovimientoTrabajador"("trabajadorId");

-- CreateIndex
CREATE INDEX "MovimientoTrabajador_fecha_idx" ON "MovimientoTrabajador"("fecha");

-- AddForeignKey
ALTER TABLE "Asistencia" ADD CONSTRAINT "Asistencia_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoTrabajador" ADD CONSTRAINT "MovimientoTrabajador_trabajadorId_fkey" FOREIGN KEY ("trabajadorId") REFERENCES "Trabajador"("id") ON DELETE CASCADE ON UPDATE CASCADE;
