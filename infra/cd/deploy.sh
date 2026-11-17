#!/usr/bin/env bash
# =============================================================================
# CD pull-based de mdw en el VPS.
#
# Lo dispara un systemd timer (infra/cd/mdw-deploy.timer). Cada corrida:
#   1. Consulta el SHA de origin/main con `git ls-remote` (una llamada, sin
#      descargar objetos). Si es el último desplegado CON ÉXITO, termina ahí.
#   2. Si cambió: pull fast-forward, `docker compose up -d --build`,
#      reload de global-nginx (cachea la IP vieja del container y tira 502),
#      y curl al /api/health público hasta que responda 200.
#   3. Recién con el health OK anota el SHA como desplegado y limpia imágenes
#      colgadas para no llenar el disco del VPS.
#
# Estado en $STATE_DIR (lo crea systemd con StateDirectory=):
#   last-ok      SHA del último deploy con health OK. Se compara contra este
#                y NO contra HEAD: HEAD avanza con el pull, antes del build, y
#                si el build fallaba la corrida siguiente lo daba por hecho.
#   last-failed  "<sha> <intentos>" del commit que viene fallando. Pasados
#                MAX_ATTEMPTS se deja de reintentar hasta que llegue otro
#                commit, para no recompilar Next cada 5 min en un VPS compartido.
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
STATE_DIR="${STATE_DIR:-/var/lib/mdw-deploy}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"        # reintentos por commit antes de rendirse

PROJECT_NAME="${PROJECT_NAME:-mdw}"
COMPOSE_FILE="infra/docker/docker-compose.prod.yaml"
COMPOSE=(docker compose --env-file .env -f "$COMPOSE_FILE")
# Lo único del host que el compose puede montar (rutas relativas a APP_DIR)
ALLOWED_BINDS=(infra/docker/db_data)
# Redes de Docker ajenas al proyecto a las que se puede conectar (JSON)
EXTERNAL_NETWORKS='["proxy-network"]'
# Servicios que pueden conectarse a esas redes. Compose registra el nombre del
# servicio como alias DNS: un servicio llamado como el container de otra app le
# robaría tráfico a global-nginx (JSON)
EXTERNAL_SERVICES='["app"]'

log() { printf '%s [mdw-deploy] %s\n' "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$*"; }
die() { log "ERROR: $*"; exit 1; }

# -----------------------------------------------------------------------------
# Guardia del compose. El daemon de Docker es root y el VPS es compartido: un
# compose malicioso puede darle el host entero a quien lo mergee (`privileged`,
# el socket de Docker, montar `/`) o meterse con otras apps (sus volúmenes, sus
# redes, su tráfico). Esta función es la defensa que NO depende de GitHub.
#
# Valida con LISTA BLANCA: solo pasa lo que este proyecto usa hoy. Si mañana
# hace falta una clave nueva, se agrega acá con review del dueño del VPS.
# Una lista negra no alcanza; compose tiene demasiadas formas de llegar al host.
#
#   1. Texto crudo: UTF-8 sin bytes NUL (si no, un archivo en UTF-16, que
#      compose lee igual, esquiva el grep), y sin `extends`, `include` ni
#      `env_file`. Compose los resuelve al renderizar (leen archivos del host
#      como root) y la clave desaparece del resultado, así que hay que
#      frenarlos antes. Sin `\` ni `!` para que no se puedan escribir esas
#      claves con escapes ni con tags de YAML (`!!binary` en base64).
#   2. Modelo renderizado (`config --format json`): claves permitidas, nombres
#      propios del proyecto para volúmenes, redes, containers e imágenes, y
#      `proxy-network` como única red externa, solo para EXTERNAL_SERVICES y
#      sin alias ni IP fija.
#   3. Rutas del host, ya resueltas con `realpath`. Binds: solo los de
#      ALLOWED_BINDS, ruta exacta. Contexto de build: exactamente APP_DIR.
#      Dockerfile: dentro del proyecto y fuera de los binds. No se aceptan
#      subdirectorios arbitrarios: un container con un bind escribible podría
#      crear ahí un symlink a `/` después de esta verificación, y otro
#      container o el build lo seguirían en el mismo deploy.
#
# Requiere `jq` en el VPS.
# -----------------------------------------------------------------------------
check_compose() {
  command -v jq >/dev/null || die "falta jq en el VPS (apt-get install -y jq); sin jq no se valida el compose"

  # --- 1. Texto crudo
  if [[ "$(tr -d '\000' <"$COMPOSE_FILE" | wc -c)" != "$(wc -c <"$COMPOSE_FILE")" ]] \
    || ! iconv -f UTF-8 -t UTF-8 "$COMPOSE_FILE" >/dev/null 2>&1; then
    die "compose rechazado, tiene que estar en UTF-8 sin bytes NUL"
  fi
  local hit
  if hit="$(grep -niE 'extends|include|env_file|[\\!]' "$COMPOSE_FILE")"; then
    die "compose rechazado, usa extends/include/env_file, barras invertidas o tags (!):"$'\n'"$hit"
  fi

  # --- 2. Modelo renderizado. --no-env-resolution deja `env_file` a la vista
  #        en vez de copiar el contenido del archivo a `environment`.
  local rendered
  rendered="$("${COMPOSE[@]}" config --format json --no-env-resolution 2>&1)" \
    || die "compose inválido (salida omitida para no volcar archivos al log)"

  local violations
  violations="$(jq -r --arg p "$PROJECT_NAME" --argjson ext "$EXTERNAL_NETWORKS" \
    --argjson extsvc "$EXTERNAL_SERVICES" '
    def extra($allowed): (keys - $allowed)[];
    . as $top |
    ( select(.name != $p) | "nombre de proyecto \(.name), se espera \($p)" ),
    ( keys - ["name", "services", "volumes", "networks"]
      | map(select(startswith("x-") | not))[]
      | "clave de primer nivel no permitida: \(.)" ),
    ( .services // {} | to_entries[] | .key as $s | .value |
        ( extra(["build", "command", "container_name", "depends_on", "deploy",
                 "entrypoint", "environment", "expose", "healthcheck", "image",
                 "logging", "networks", "restart", "security_opt", "volumes"])
          | "\($s): clave no permitida: \(.)" ),
        ( .container_name // empty | select(startswith("\($p)-") | not)
          | "\($s): container_name \(.) tiene que empezar con \($p)-" ),
        ( select(.build != null) | .image // empty | select(startswith("\($p)-") | not)
          | "\($s): una imagen construida tiene que llamarse \($p)-*, no \(.)" ),
        ( .build // {} | extra(["context", "dockerfile", "target"])
          | "\($s): build.\(.) no permitido" ),
        ( .build.dockerfile // empty | select(startswith("/") or contains(".."))
          | "\($s): build.dockerfile \(.) fuera del contexto" ),
        ( .deploy // {} | extra(["resources", "placement"])
          | "\($s): deploy.\(.) no permitido" ),
        ( .deploy.placement // {} | extra([])
          | "\($s): deploy.placement.\(.) no permitido" ),
        ( .deploy.resources // {} | extra(["limits"])
          | "\($s): deploy.resources.\(.) no permitido" ),
        ( .deploy.resources.limits // {} | extra(["cpus", "memory", "pids"])
          | "\($s): deploy.resources.limits.\(.) no permitido" ),
        ( .security_opt // [] | .[] | select(. != "no-new-privileges:true")
          | "\($s): security_opt \(.) no permitido" ),
        ( .logging // {} | select((.driver // "json-file") != "json-file")
          | "\($s): logging.driver \(.driver) no permitido" ),
        ( .networks // {} | to_entries[] | select(.value != null and .value != {})
          | "\($s): red \(.key) con opciones (aliases, IP fija...) no permitidas" ),
        ( select($s | IN($extsvc[]) | not) | .networks // {} | keys[]
          | select($top.networks[.].external == true)
          | "\($s): solo \($extsvc | join(", ")) puede conectarse a la red externa \(.)" ),
        ( .volumes // [] | .[] | select(.type != "volume" and .type != "bind")
          | "\($s): volumen de tipo \(.type) no permitido" ) ),
    ( .volumes // {} | to_entries[] | .key as $v | .value |
        ( extra(["name"]) | "volumen \($v): \(.) no permitido" ),
        ( select(.name != "\($p)_\($v)")
          | "volumen \($v): name \(.name) no permitido (volumen de otro proyecto)" ) ),
    ( .networks // {} | to_entries[] | .key as $n | .value |
        ( extra(["name", "ipam", "internal", "external"]) | "red \($n): \(.) no permitido" ),
        ( select((.ipam // {}) != {}) | "red \($n): ipam no permitido" ),
        ( select(.external == true and (.name | IN($ext[]) | not))
          | "red \($n): red externa \(.name) no permitida" ),
        ( select(.external != true and .name != "\($p)_\($n)")
          | "red \($n): name \(.name) no permitido (red de otro proyecto)" ) )
  ' <<<"$rendered")" || die "no pude analizar el compose renderizado"
  if [[ -n "$violations" ]]; then
    die "compose rechazado, usa opciones fuera de la lista blanca:"$'\n'"$violations"
  fi

  # --- 3. Rutas del host. `realpath` resuelve symlinks: se compara la ruta
  #        resuelta, no la escrita.
  local root kind path real allowed ok
  root="$(realpath "$APP_DIR")"
  while IFS=$'\t' read -r kind path; do
    [[ -n "$path" ]] || continue
    real="$(realpath -m -- "$path")"
    ok=false
    case "$kind" in
      context) [[ "$real" == "$root" ]] && ok=true ;;
      bind)
        for allowed in "${ALLOWED_BINDS[@]}"; do
          [[ "$real" == "$root/$allowed" ]] && ok=true
        done
        ;;
      dockerfile)
        [[ "$real" == "$root/"* ]] && ok=true
        for allowed in "${ALLOWED_BINDS[@]}"; do
          [[ "$real" == "$root/$allowed" || "$real" == "$root/$allowed/"* ]] && ok=false
        done
        ;;
    esac
    $ok || die "compose rechazado, $kind no permitido: $path -> $real"
  done < <(jq -r '.services[]
    | ((.volumes // [])[] | select(.type == "bind") | ["bind", .source]),
      (.build // empty | ["context", .context],
        ["dockerfile", "\(.context)/\(.dockerfile // "Dockerfile")"])
    | @tsv' <<<"$rendered")

  log "compose verificado: solo opciones de la lista blanca"
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
deployed_sha="$(cat "$STATE_DIR/last-ok" 2>/dev/null || true)"

if [[ "$remote_sha" == "$deployed_sha" ]]; then
  exit 0
fi

# Un commit que ya falló MAX_ATTEMPTS veces no se reintenta: se destraba con
# un commit nuevo en main (fix o revert)
failed_sha="" attempts=0
read -r failed_sha attempts <"$STATE_DIR/last-failed" 2>/dev/null || true
if [[ "$failed_sha" == "$remote_sha" ]] && ((attempts >= MAX_ATTEMPTS)); then
  exit 0
fi

# Cualquier salida con error a partir de acá (die, set -e) cuenta como intento
# fallido de este commit. La salida exitosa tiene rc 0 y no anota nada.
on_exit() {
  local rc=$?
  ((rc == 0)) && return
  local n=1
  [[ "$failed_sha" == "$remote_sha" ]] && n=$((attempts + 1))
  echo "$remote_sha $n" >"$STATE_DIR/last-failed"
  log "intento $n/$MAX_ATTEMPTS de ${remote_sha:0:7} falló"
}
trap on_exit EXIT

log "cambio detectado en $BRANCH: ${deployed_sha:0:7} -> ${remote_sha:0:7}"

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
    echo "$remote_sha" >"$STATE_DIR/last-ok"
    rm -f "$STATE_DIR/last-failed"
    # Solo imágenes colgadas de ESTE proyecto: el VPS es compartido
    docker image prune -f --filter "label=com.docker.compose.project=mdw" >/dev/null 2>&1 || true
    log "deploy de ${remote_sha:0:7} terminado"
    exit 0
  fi
  sleep "$HEALTH_INTERVAL"
done

# El rollback real es revertir en main: si solo se hace reset acá, el timer
# vuelve a traer el commit roto en la próxima corrida
die "health no respondió ok tras $((HEALTH_RETRIES * HEALTH_INTERVAL))s. Rollback: revertir el commit en main; si urge, systemctl stop mdw-deploy.timer && git reset --hard ${deployed_sha:-<sha bueno>} && ${COMPOSE[*]} up -d --build && docker exec $NGINX_CONTAINER nginx -s reload"
