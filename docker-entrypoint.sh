#!/bin/sh
set -e

# Aplica migraciones pendientes en la base de datos (idempotente).
echo "→ Aplicando migraciones Prisma..."
node node_modules/prisma/build/index.js migrate deploy || echo "⚠ migrate deploy falló (¿DB lista?), continuo"

# Arranca la app Next.js (build standalone).
echo "→ Iniciando Benechito..."
exec node server.js
