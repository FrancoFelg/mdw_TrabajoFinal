#!/usr/bin/env bash
# =============================================================================
# Pruebas de la guardia del compose (check_compose en deploy.sh).
#
#   bash infra/cd/check-compose.test.sh
#
# Requiere bash, docker compose, jq y realpath (GNU coreutils). No levanta
# containers: solo ejecuta `docker compose config`. Trabaja en un directorio
# temporal y lo borra al terminar.
#
# Verifica que el compose real de producción PASA y que cada forma conocida de
# llegar al host o a otras apps del VPS desde un compose se RECHAZA.
# =============================================================================
set -Eeuo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# La función y su configuración real, sin ejecutar el runner
{
  grep -E '^(PROJECT_NAME|ALLOWED_BINDS|EXTERNAL_NETWORKS|EXTERNAL_SERVICES)=' "$REPO/infra/cd/deploy.sh"
  sed -n '/^check_compose() {/,/^}/p' "$REPO/infra/cd/deploy.sh"
} >"$WORK/check.sh"
grep -q '^check_compose() {' "$WORK/check.sh" || { echo "no encontré check_compose en deploy.sh"; exit 1; }

printf '%s\n' MYSQL_USER=u MYSQL_PASSWORD=p MYSQL_DATABASE=d MYSQL_ROOT_PASSWORD=r JWT_SECRET=j >"$WORK/test.env"

failures=0

# run_case <nombre> <ACCEPT|REJECT> <app_dir> <compose>
run_case() {
  local name="$1" expected="$2" app_dir="$3" compose="$4" got
  # Las variables y funciones las usa check_compose, que se carga con source
  # shellcheck disable=SC2034,SC2329
  got="$(
    APP_DIR="$app_dir"
    COMPOSE_FILE="$compose"
    COMPOSE=(docker compose --env-file "$WORK/test.env" -f "$compose")
    log() { :; }
    die() { printf 'REJECT: %s\n' "$*"; exit 1; }
    # shellcheck source=/dev/null
    source "$WORK/check.sh"
    check_compose && echo ACCEPT
  )" || true
  if [[ "$got" == "$expected"* ]]; then
    printf 'ok    %-26s %s\n' "$name" "${got%%$'\n'*}"
  else
    printf 'FAIL  %-26s esperaba %s, obtuve: %s\n' "$name" "$expected" "$got"
    failures=$((failures + 1))
  fi
}

# --- El compose real de producción tiene que pasar
run_case prod ACCEPT "$REPO" "$REPO/infra/docker/docker-compose.prod.yaml"

# --- Casos sintéticos: proyecto falso en $WORK/app, con la misma estructura
APP="$WORK/app"
mkdir -p "$APP/data" "$APP/infra/docker/db_data" "$APP/infra/docker/link_dir"
ln -s / "$APP/evil"
ln -s / "$APP/infra/docker/link_dir/db_data"
ln -s /etc "$APP/etclink"
printf 'services:\n  x:\n    image: alpine\n' >"$APP/extra.yaml"

# case_yaml <nombre> <esperado> <yaml>
case_yaml() {
  printf '%s' "$3" >"$APP/compose.yaml"
  run_case "$1" "$2" "$APP" "$APP/compose.yaml"
}

svc=$'name: mdw\nservices:\n  app:\n    image: alpine\n'
build=$'name: mdw\nservices:\n  app:\n    build:\n      context: .\n'

# Lo que el proyecto usa tiene que pasar
case_yaml bind-db-data ACCEPT "${svc}"$'    volumes:\n      - ./infra/docker/db_data:/var/lib/mysql\n'
case_yaml named-volume ACCEPT "${svc}"$'    volumes:\n      - uploads:/d\nvolumes:\n  uploads: {}\n'
case_yaml build-own-image ACCEPT "${build}"$'    image: mdw-app:prod\n'
case_yaml proxy-network ACCEPT "${svc}"$'    networks: [proxy-network, internal]\nnetworks:\n  proxy-network:\n    external: true\n  internal:\n    internal: true\n'

# Acceso al host
case_yaml privileged REJECT "${svc}"$'    privileged: true\n'
case_yaml cap-add REJECT "${svc}"$'    cap_add: [SYS_ADMIN]\n'
case_yaml ports REJECT "${svc}"$'    ports: ["8080:80"]\n'
case_yaml network-host REJECT "${svc}"$'    network_mode: host\n'
case_yaml pid-host REJECT "${svc}"$'    pid: host\n'
case_yaml cgroup-host REJECT "${svc}"$'    cgroup: host\n'
case_yaml devices REJECT "${svc}"$'    devices: ["/dev/sda:/dev/sda"]\n'
case_yaml seccomp-unconfined REJECT "${svc}"$'    security_opt: ["seccomp:unconfined"]\n'
case_yaml label-disable REJECT "${svc}"$'    security_opt: ["label:disable"]\n'
case_yaml docker-sock REJECT "${svc}"$'    volumes:\n      - /var/run/docker.sock:/s\n'
case_yaml bind-root REJECT "${svc}"$'    volumes:\n      - /:/host\n'
case_yaml bind-dotdot REJECT "${svc}"$'    volumes:\n      - ../../../:/host\n'
case_yaml bind-app-dir REJECT "${svc}"$'    volumes:\n      - .:/repo\n'
case_yaml bind-subdir REJECT "${svc}"$'    volumes:\n      - ./data:/d\n'
case_yaml bind-symlink REJECT "${svc}"$'    volumes:\n      - ./evil:/host\n'
case_yaml bind-symlink-named REJECT "${svc}"$'    volumes:\n      - ./infra/docker/link_dir/db_data:/host\n'
case_yaml bind-symlink-race REJECT "${svc}"$'    volumes:\n      - ./data/link:/host\n'
case_yaml volume-driver-opts REJECT "${svc}"$'    volumes:\n      - hostroot:/host\nvolumes:\n  hostroot:\n    driver: local\n    driver_opts: {type: none, o: bind, device: /}\n'
case_yaml secret-file REJECT "${svc}"$'    secrets: [s]\nsecrets:\n  s:\n    file: /etc/shadow\n'
case_yaml config-file REJECT "${svc}"$'    configs: [c]\nconfigs:\n  c:\n    file: /root/.ssh/authorized_keys\n'
case_yaml env-file REJECT "${svc}"$'    env_file: [/etc/hostname]\n'
case_yaml env-file-escaped REJECT "${svc}"$'    "env\\u005ffile": [/etc/hostname]\n'
case_yaml extends REJECT "${svc}"$'    extends: {file: ./extra.yaml, service: x}\n'
case_yaml include REJECT $'include: [./extra.yaml]\n'"${svc}"
case_yaml build-extra-ctx REJECT "${build}"$'      additional_contexts:\n        host: /\n'
case_yaml build-ctx-subdir REJECT $'name: mdw\nservices:\n  app:\n    build:\n      context: ./infra/docker/db_data/ctx\n'
case_yaml dockerfile-in-bind REJECT "${build}"$'      dockerfile: infra/docker/db_data/Dockerfile\n'
case_yaml dockerfile-symlink REJECT "${build}"$'      dockerfile: etclink/hostname\n'
case_yaml build-ctx-outside REJECT $'name: mdw\nservices:\n  app:\n    build:\n      context: /\n'
case_yaml dockerfile-absolute REJECT "${build}"$'      dockerfile: /etc/hostname\n'
case_yaml dockerfile-dotdot REJECT "${build}"$'      dockerfile: ../../etc/hostname\n'
case_yaml gpu-reservation REJECT "${svc}"$'    deploy:\n      resources:\n        reservations:\n          devices:\n            - capabilities: [gpu]\n'
case_yaml logging-syslog REJECT "${svc}"$'    logging:\n      driver: syslog\n'

# Otras apps del VPS
case_yaml project-name REJECT $'name: otherapp\nservices:\n  app:\n    image: alpine\n'
case_yaml volume-other-project REJECT "${svc}"$'    volumes:\n      - v1:/d\nvolumes:\n  v1:\n    name: otherapp_data\n'
case_yaml volume-external REJECT "${svc}"$'    volumes:\n      - v1:/d\nvolumes:\n  v1:\n    external: true\n'
case_yaml network-other-project REJECT "${svc}"$'    networks: [n1]\nnetworks:\n  n1:\n    name: otherapp_internal\n    external: true\n'
case_yaml network-rename REJECT "${svc}"$'    networks: [n1]\nnetworks:\n  n1:\n    name: otherapp_internal\n'
case_yaml network-alias REJECT "${svc}"$'    networks:\n      proxy-network:\n        aliases: [otherapp-app]\nnetworks:\n  proxy-network:\n    external: true\n'
case_yaml network-fixed-ip REJECT "${svc}"$'    networks:\n      proxy-network:\n        ipv4_address: 172.18.0.50\nnetworks:\n  proxy-network:\n    external: true\n'
case_yaml container-name-other REJECT "${svc}"$'    container_name: otherapp-app\n'
case_yaml image-overwrite REJECT "${build}"$'    image: otherapp-app:latest\n'
case_yaml service-name-alias REJECT $'name: mdw\nservices:\n  otherapp-app:\n    image: alpine\n    networks: [proxy-network]\nnetworks:\n  proxy-network:\n    external: true\n'

# Codificación: un compose en UTF-16 que compose lee igual y esquiva el grep
printf '%s' "${svc}"$'    extends: {file: ./extra.yaml, service: x}\n' | iconv -t UTF-16 >"$APP/utf16.yaml"
run_case utf16-extends REJECT "$APP" "$APP/utf16.yaml"
printf '%s' $'include: [./extra.yaml]\n'"${svc}" | iconv -t UTF-16LE >"$APP/utf16le.yaml"
run_case utf16le-include REJECT "$APP" "$APP/utf16le.yaml"
printf '%s' "${svc}" | iconv -t LATIN1 >"$APP/latin1.yaml"
printf '    command: ["echo", "\xf1"]\n' >>"$APP/latin1.yaml"
run_case not-utf8 REJECT "$APP" "$APP/latin1.yaml"

if ((failures > 0)); then
  echo "$failures caso(s) fallaron"
  exit 1
fi
echo "todos los casos OK"
