#!/usr/bin/env bash
# =============================================================================
# CD pull-based de mdw en el VPS.
#
# Lo dispara un systemd timer (infra/cd/mdw-deploy.timer). Cada corrida:
#   1. Consulta el SHA de origin/main con `git ls-remote` (una llamada, sin
#      descargar objetos). Si es el mismo que el local, termina ahí.
#   2. Si cambió: pull fast-forward, `docker compose up -d --build`,
#      reload de global-nginx (cachea la IP vieja del container y tira 502),
#      y curl al /api/health público hasta que responda 200.
#   3. Limpia imágenes colgadas para no llenar el disco del VPS.
#
# Nada sale del servidor: no hay secrets en GitHub ni webhooks expuestos.
# "Lo que llega a main se despliega", por eso main tiene que estar protegida
# con el CI como check requerido y review obligatorio de CODEOWNERS en infra/.
#
# SEGURIDAD: este archivo se instala como COPIA en /usr/local/bin/mdw-deploy.
# El service no ejecuta la versión del repo, así un cambio en git no puede
# alterar el runner que corre como root. Para actualizar el runner hay que
# volver a copiarlo a mano (ver DEPLOY.md).
# =============================================================================
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/mdw_TrabajoFinal}"
BRANCH="${BRANCH:-main}"
HEALTH_URL="${HEALTH_URL:-https://mdw.guillermonatali.com/api/health}"
NGINX_CONTAINER="${NGINX_CONTAINER:-global-nginx}"
LOCK_FILE="${LOCK_FILE:-/var/lock/mdw-deploy.lock}"
HEALTH_RETRIES="${HEALTH_RETRIES:-12}"   # 12 x 5s = 60s de gracia
HEALTH_INTERVAL="${HEALTH_INTERVAL:-5}"

COMPOSE=(docker compose --env-file .env -f infra/docker/docker-compose.prod.yaml)

log() { printf '%s [mdw-deploy] %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$*"; }
die() { log "ERROR: $*"; exit 1; }

# -----------------------------------------------------------------------------
# Guardia del compose. El daemon de Docker es root: un compose con
# `privileged`, el socket de Docker montado o un volumen de `/` le da el VPS
# entero a quien lo mergee. Esta función renderiza el compose que se va a
# ejecutar (`docker compose config`, ya con variables resueltas) y aborta si
# aparece algo de la lista. Es la defensa que NO depende de GitHub.
# -----------------------------------------------------------------------------
check_compose() {
  local rendered
  rendered="$("${COMPOSE[@]}" config 2>&1)" || die "compose inválido: $rendered"

  # Cosas que ningún servicio de este proyecto tiene por qué pedir
  local forbidden='privileged: true|cap_add:|network_mode: host|pid: host|ipc: host|userns_mode:|devices:|unconfined|/var/run/docker\.sock|^ +ports:'
  local hit
  if hit="$(grep -nE "$forbidden" <<<"$rendered")"; then
    die "compose rechazado, contiene opciones prohibidas en este VPS:"$'\n'"$hit"
  fi

  # Bind mounts: solo dentro del directorio del proyecto. En el compose
  # renderizado un bind aparece como `source: /ruta/absoluta`.
  local bad_mounts
  bad_mounts="$(grep -E '^ +source: /' <<<"$rendered" | grep -vE "^ +source: $APP_DIR/" || true)"
  if [[ -n "$bad_mounts" ]]; then
    die "compose rechazado, monta rutas fuera de $APP_DIR:"$'\n'"$bad_mounts"
  fi

  log "compose verificado: sin opciones peligrosas"
}

# --- Lock: si otra corrida sigue en curso (build largo), esta sale sin hacer nada
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  log "otra corrida en curso, salgo"
  exit 0
fi

cd "$APP_DIR" || die "no existe $APP_DIR"

# --- Secrets solo legibles por root (compose los lee con --env-file)
if [[ "$(stat -c '%U:%a' .env)" != "root:600" ]]; then
  die ".env tiene que ser root:600 (chown root:root .env && chmod 600 .env)"
fi

# --- 1. ¿Hay algo nuevo? (ls-remote no descarga objetos, es barato)
remote_sha="$(git ls-remote --exit-code origin "refs/heads/$BRANCH" | cut -f1)" \
  || die "no pude leer origin/$BRANCH (¿llave de solo lectura del VPS OK?)"
local_sha="$(git rev-parse HEAD)"

if [[ "$remote_sha" == "$local_sha" ]]; then
  exit 0
fi

log "cambio detectado en $BRANCH: ${local_sha:0:7} -> ${remote_sha:0:7}"

# --- Seguridad: si alguien editó archivos trackeados a mano en el VPS, no pisar
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  die "working tree con cambios locales en $APP_DIR; resolver a mano antes de seguir"
fi

# --- 2. Pull fast-forward (si no es ff, alguien reescribió main: no adivinar)
git fetch --quiet origin "$BRANCH"
git merge --ff-only --quiet "origin/$BRANCH" || die "origin/$BRANCH no es fast-forward de HEAD"
log "código en $(git rev-parse --short HEAD)"

# --- 3. Antes de ejecutar nada: ¿el compose que llegó es seguro para este VPS?
check_compose

# --- 4. Build + up. `migrate` corre de nuevo (prisma migrate deploy es idempotente)
#        y `app` no arranca si migrate falla.
log "docker compose up -d --build"
"${COMPOSE[@]}" up -d --build --remove-orphans || die "compose up falló; revisar: ${COMPOSE[*]} logs migrate app"

# --- 5. Nginx cachea la IP del container viejo; sin esto, 502
docker exec "$NGINX_CONTAINER" nginx -s reload || die "no pude recargar $NGINX_CONTAINER"

# --- 6. Health real por el dominio público (valida nginx + app + DB)
for ((i = 1; i <= HEALTH_RETRIES; i++)); do
  if body="$(curl -fsS --max-time 5 "$HEALTH_URL" 2>/dev/null)" && [[ "$body" == *'"status":"ok"'* ]]; then
    log "health OK: $body"
    # Solo imágenes colgadas de ESTE proyecto: el VPS es compartido
    docker image prune -f --filter "label=com.docker.compose.project=mdw" >/dev/null 2>&1 || true
    log "deploy de ${remote_sha:0:7} terminado"
    exit 0
  fi
  sleep "$HEALTH_INTERVAL"
done

die "health no respondió ok tras $((HEALTH_RETRIES * HEALTH_INTERVAL))s. Rollback manual: git reset --hard $local_sha && ${COMPOSE[*]} up -d --build && docker exec $NGINX_CONTAINER nginx -s reload"
