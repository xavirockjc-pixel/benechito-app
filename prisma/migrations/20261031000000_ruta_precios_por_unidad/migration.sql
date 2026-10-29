-- BUGFIX de precios de ruta. Los precios de zona se guardaron como precio POR BOLSA
-- (ej. Tú y Yo $14.000) con cantidadMinima=1, pero la venta del vendedor multiplica
-- el precio × unidades del pack (50 o 16) → daba $700.000+ por bolsa (venta de +$1MM).
-- Se corrigen a precio POR UNIDAD (precio de bolsa ÷ unidades del pack); así, al
-- multiplicar por la bolsa de 50 (o pack de 16), vuelve a dar el precio correcto.
-- Idempotente: fija el valor exacto por id (re-ejecutar no lo vuelve a dividir).

-- Zona Coronel–Lota  (bolsa 50: 14000/10000/7500 · pack 16: 20800)
UPDATE "PrecioProducto" SET "precio" =  280 WHERE "id" = 'prc_tuyyo_cl';    -- 14000 / 50
UPDATE "PrecioProducto" SET "precio" =  200 WHERE "id" = 'prc_palleche_cl'; -- 10000 / 50
UPDATE "PrecioProducto" SET "precio" =  150 WHERE "id" = 'prc_palagua_cl';  --  7500 / 50
UPDATE "PrecioProducto" SET "precio" = 1300 WHERE "id" = 'prc_postre_cl';   -- 20800 / 16

-- Zona Metropolitano (bolsa 50: 15000/11000/8000 · pack 16: 22000)
UPDATE "PrecioProducto" SET "precio" =  300 WHERE "id" = 'prc_tuyyo_mt';    -- 15000 / 50
UPDATE "PrecioProducto" SET "precio" =  220 WHERE "id" = 'prc_palleche_mt'; -- 11000 / 50
UPDATE "PrecioProducto" SET "precio" =  160 WHERE "id" = 'prc_palagua_mt';  --  8000 / 50
UPDATE "PrecioProducto" SET "precio" = 1375 WHERE "id" = 'prc_postre_mt';   -- 22000 / 16

-- Zona Los Ángeles  (bolsa 50: 16000/11000/8000 · pack 16: 22000)
UPDATE "PrecioProducto" SET "precio" =  320 WHERE "id" = 'prc_tuyyo_la';    -- 16000 / 50
UPDATE "PrecioProducto" SET "precio" =  220 WHERE "id" = 'prc_palleche_la'; -- 11000 / 50
UPDATE "PrecioProducto" SET "precio" =  160 WHERE "id" = 'prc_palagua_la';  --  8000 / 50
UPDATE "PrecioProducto" SET "precio" = 1375 WHERE "id" = 'prc_postre_la';   -- 22000 / 16
