#!/usr/bin/env bash
# =============================================================================
# Pruebas de los límites por IP de infra/nginx/mdw.conf.
#
#   bash infra/nginx/check-limits.test.sh
#
# Requiere docker y curl. Arma un nginx de prueba con los `map`,
# `limit_req_zone` y `limit_req` reales de mdw.conf (sin certificados ni
# proxy: responde 204), lo levanta en un puerto local libre y lo borra al
# terminar. NGINX_IMAGE permite probar con la misma versión que global-nginx.
# =============================================================================
set -Eeuo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CONF="$REPO/infra/nginx/mdw.conf"
IMAGE="${NGINX_IMAGE:-nginx:1.27-alpine}"
WORK="$(mktemp -d)"
NAME="mdw-limits-test-$$"
cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; rm -rf "$WORK"; }
trap cleanup EXIT

{
  # Todo lo anterior al primer `server {`: maps y zonas
  sed -n '1,/^server {/p' "$CONF" | sed '$d'
  # Como en producción, la respuesta sale por proxy_pass (fase de contenido).
  # Un `return` directo corre en la fase rewrite, antes que limit_req, y la
  # prueba nunca vería un 429.
  echo 'server {'
  echo '    listen 8080;'
  echo '    location / {'
  grep -E '^\s*limit_req(_status)?\s' "$CONF"
  echo '        proxy_pass http://127.0.0.1:8081;'
  echo '    }'
  echo '}'
  echo 'server { listen 8081; return 204; }'
} >"$WORK/default.conf"

docker run -d --name "$NAME" -p 127.0.0.1::8080 \
  -v "$WORK/default.conf:/etc/nginx/conf.d/default.conf:ro" "$IMAGE" >/dev/null
docker exec "$NAME" nginx -t -q

# Espera a que nginx responda y anota la URL. Docker asigna otro puerto en cada
# reinicio, así que se vuelve a leer siempre.
base=""
ready() {
  local port
  port="$(docker port "$NAME" 8080/tcp | head -1 | sed 's/.*://')"
  base="http://127.0.0.1:$port"
  for _ in $(seq 1 50); do
    [[ "$(curl -s -o /dev/null -w '%{http_code}' "$base/")" == 204 ]] && return
    sleep 0.1
  done
  echo "nginx de prueba no respondió en $base"
  exit 1
}
# Reiniciar vacía las zonas de memoria compartida (un reload no lo hace)
fresh() { docker restart "$NAME" >/dev/null; ready; }
ready

failures=0

# count_429 <cantidad> <curl args...>: cuántas de N solicitudes seguidas dieron 429
count_429() {
  local n="$1" i hits=0 code
  shift
  for ((i = 0; i < n; i++)); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "$@")"
    [[ "$code" == 429 ]] && hits=$((hits + 1))
  done
  echo "$hits"
}

# check <nombre> <esperado: some|none> <cantidad> <ruta> [curl args...]
check() {
  local name="$1" expected="$2" n="$3" path="$4" hits
  shift 4
  hits="$(count_429 "$n" "$@" "$base$path")"
  if [[ "$expected" == some && "$hits" -gt 0 ]] || [[ "$expected" == none && "$hits" -eq 0 ]]; then
    printf 'ok    %-34s %s de %s con 429\n' "$name" "$hits" "$n"
  else
    printf 'FAIL  %-34s esperaba %s, obtuve %s de %s con 429\n' "$name" "$expected" "$hits" "$n"
    failures=$((failures + 1))
  fi
}

# Todas las solicitudes salen de la misma IP (127.0.0.1), así que cada zona se
# prueba con el container recién reiniciado para que no se mezclen contadores.
check get-paginas none 80 /casos
check post-sin-accion none 40 /casos -X POST
check get-con-accion none 40 /casos -H 'Next-Action: abc'

fresh
check accion-en-otra-pagina some 40 /casos -X POST -H 'Next-Action: abc'

fresh
check accion-login-en-su-pagina some 30 /login -X POST -H 'Next-Action: abc'

fresh
check login-api some 30 /api/auth/login -X POST

fresh
check reporte-api some 30 /api/emergencias -X POST

if ((failures > 0)); then
  echo "$failures caso(s) fallaron"
  exit 1
fi
echo "todos los casos OK"
