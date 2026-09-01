-- Extensión Facturación: campos de facturación en Negocio + tablas DocumentoVenta y ConfigFacturacion.
-- Migración ADITIVA: no borra ni modifica columnas existentes.

-- AlterTable: Negocio (campos de facturación)
ALTER TABLE "Negocio"
    ADD COLUMN "tipoDocumentoDefault" TEXT NOT NULL DEFAULT 'boleta',
    ADD COLUMN "requiereFactura" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN "giro" TEXT,
    ADD COLUMN "direccionFacturacion" TEXT,
    ADD COLUMN "emailFacturacion" TEXT;

-- CreateTable: DocumentoVenta
CREATE TABLE "DocumentoVenta" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "negocioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "documentoReferenciaId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "folio" TEXT,
    "montoNeto" DECIMAL(12,2),
    "iva" DECIMAL(12,2),
    "montoTotal" DECIMAL(12,2) NOT NULL,
    "urlPdf" TEXT,
    "fechaEmision" TIMESTAMP(3),
    "fechaEnvio" TIMESTAMP(3),
    "canalEnvio" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentoVenta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentoVenta_ventaId_idx" ON "DocumentoVenta"("ventaId");
CREATE INDEX "DocumentoVenta_negocioId_idx" ON "DocumentoVenta"("negocioId");
CREATE INDEX "DocumentoVenta_estado_idx" ON "DocumentoVenta"("estado");

-- CreateTable: ConfigFacturacion
CREATE TABLE "ConfigFacturacion" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "proveedor" TEXT NOT NULL DEFAULT 'sii_directo',
    "apiKey" TEXT,
    "ambiente" TEXT NOT NULL DEFAULT 'certificacion',
    "activo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConfigFacturacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConfigFacturacion_empresaId_key" ON "ConfigFacturacion"("empresaId");

-- AddForeignKey
ALTER TABLE "DocumentoVenta" ADD CONSTRAINT "DocumentoVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentoVenta" ADD CONSTRAINT "DocumentoVenta_negocioId_fkey" FOREIGN KEY ("negocioId") REFERENCES "Negocio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentoVenta" ADD CONSTRAINT "DocumentoVenta_documentoReferenciaId_fkey" FOREIGN KEY ("documentoReferenciaId") REFERENCES "DocumentoVenta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ConfigFacturacion" ADD CONSTRAINT "ConfigFacturacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
