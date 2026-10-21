-- El producto "Pack postres x16" se cuenta por pack de 16: aparece en el sector
-- de packs de bodega y el camión. Idempotente.
UPDATE "Producto" SET "unidadesPack" = 16 WHERE "nombre" = 'Pack postres x16';
