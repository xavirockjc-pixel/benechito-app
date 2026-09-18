-- Fabricación editable: preparador (quién mezcló) y reparto por depósitos (JSON).
ALTER TABLE "ControlCalidad" ADD COLUMN "preparador" TEXT;
ALTER TABLE "ControlCalidad" ADD COLUMN "depositos" TEXT;
