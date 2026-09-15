# =============================================================================
# Dockerfile de producción - Next.js 16 + pnpm + Prisma (multi-stage)
# Contexto de build: la RAÍZ del repo (ver docker-compose.prod.yaml)
#   docker build -f infra/docker/Dockerfile .
# Requiere `output: "standalone"` en next.config.ts
#
# Stages:
#   base    -> Node 22 alpine + pnpm + openssl (Prisma lo necesita en musl)
#   deps    -> node_modules cacheados
#   build   -> prisma generate + next build
#   migrate -> imagen chica con el CLI de Prisma para `migrate deploy`
#   runner  -> imagen final standalone, sin devDeps ni código fuente
# =============================================================================

# ---- Base: Node 22 LTS (Next 16 exige >= 20.9) con pnpm vía corepack ----
FROM node:22-alpine AS base
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
# openssl: los engines de Prisma en Alpine (linux-musl-openssl-3.0.x) lo
# requieren en runtime; sin esto el cliente falla al abrir la conexión
RUN apk add --no-cache openssl libc6-compat \
    && corepack enable

# ---- Deps: instala node_modules aparte para cachear esta capa ----
# Solo se invalida si cambian los manifests, no en cada cambio de código
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- Build: genera el cliente de Prisma y compila la app ----
FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# `prisma generate` corre ACÁ (dentro de alpine) para que el engine generado
# sea el nativo de musl. No hay postinstall que lo haga, así que es explícito.
# Si el build necesita variables públicas (NEXT_PUBLIC_*), pasarlas como
# ARG acá — se serializan en el bundle en build-time, no en runtime
RUN pnpm prisma generate \
    && pnpm build

# ---- Migrate: one-shot para aplicar migraciones antes de levantar la app ----
# Usa las deps ya instaladas (trae el CLI de prisma) + solo la carpeta prisma/.
# El standalone NO incluye el CLI, por eso va en imagen aparte.
FROM deps AS migrate
WORKDIR /app
COPY prisma ./prisma
CMD ["pnpm", "prisma", "migrate", "deploy"]

# ---- Runner: imagen final mínima, sin devDeps ni código fuente ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Usuario sin privilegios: si comprometen el proceso, no son root
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# El output standalone trae server.js + las deps mínimas traceadas
# (incluye .prisma/client con el engine), pero NO incluye public/ ni
# .next/static — hay que copiarlos a mano
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
# 0.0.0.0 para aceptar conexiones desde fuera del contenedor
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
