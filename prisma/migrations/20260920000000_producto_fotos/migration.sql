-- Galería de fotos por producto (varias, en orden de subida) para el carrusel.
CREATE TABLE "ProductoFoto" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductoFoto_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ProductoFoto_productoId_idx" ON "ProductoFoto"("productoId");
ALTER TABLE "ProductoFoto" ADD CONSTRAINT "ProductoFoto_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- La foto actual de cada producto pasa a ser la primera de su galería.
INSERT INTO "ProductoFoto" ("id", "productoId", "url", "orden")
SELECT md5(random()::text || "id"), "id", "fotoUrl", 0
FROM "Producto"
WHERE "fotoUrl" IS NOT NULL AND "fotoUrl" <> '';
