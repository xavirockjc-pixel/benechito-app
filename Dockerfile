# ---- Dependencias ----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build ----
FROM node:22-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# ---- Runtime ----
FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Build autocontenido de Next.js
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# node_modules COMPLETO (deps): asegura que la CLI de Prisma (migrate deploy) y el
# seed (npm run seed) tengan TODAS sus dependencias, incluidas las transitivas
# (effect, bcryptjs, etc.) que el build autocontenido de Next no incluye.
COPY --from=deps /app/node_modules ./node_modules
# Cliente de Prisma ya generado en el build (el stage deps no lo tiene)
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Prisma: esquema y migraciones (para migrate deploy en el arranque)
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# Carpeta de caché de Next escribible por el usuario de runtime (evita EACCES en /app/.next/cache).
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
