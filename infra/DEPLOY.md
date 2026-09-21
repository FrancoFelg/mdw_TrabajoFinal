# Deploy de mdw en el VPS

La app corre en `/opt/mdw_TrabajoFinal` con su propio compose, detrás del Nginx central (`global-nginx`) y con cert de Let's Encrypt emitido por el Certbot central. El compose NO abre puertos: `global-nginx` alcanza al container `mdw-app` por la red `proxy-network`. La DB queda en una red aislada.

## Detalles

| Tema | Decisión |
|------|----------|
| Container / puerto | `mdw-app` : `3000`. Es lo que usa `proxy_pass` en `infra/nginx/mdw.conf`. |
| Migraciones | Servicio `migrate` corre `prisma migrate deploy` antes de `app`. Si falla, `app` no arranca. |
| Datos de MySQL | Bind mount en `/opt/mdw_TrabajoFinal/infra/docker/db_data` (patrón del VPS). Hacer backup de esa carpeta. |
| Redeploy | Automático al mergear a `main` (ver sección CD). A mano: `git pull && docker compose --env-file .env -f infra/docker/docker-compose.prod.yaml up -d --build`, y después **siempre** `docker exec global-nginx nginx -s reload` (Nginx cachea la IP vieja y tira 502). |
| Secretos | Solo en `/opt/mdw_TrabajoFinal/.env` del servidor (mismo `.env.example` que dev). Nunca commitear. |
| Healthcheck | `GET /api/health` → `200 {status:"ok"}` si app y DB responden; `503 {status:"degraded"}` si la DB no. Lo usan el healthcheck de Docker y sirve para Uptime Kuma. |

## CD: deploy automático desde `main`

Pull-based y 100% interno al VPS: no hay secrets del servidor en GitHub ni webhooks expuestos. Un timer de systemd corre `infra/cd/deploy.sh` cada 5 minutos; el script consulta el SHA de `origin/main` con `git ls-remote` (una llamada, sin descargar nada) y solo si cambió hace pull, build, reload de Nginx y curl al `/api/health`. Con `flock` para que dos corridas no se pisen.

**Consecuencia**: lo que llega a `main` se despliega. Por eso `main` tiene que tener branch protection con el job de CI como check requerido y merges solo por PR.

### Modelo de seguridad

El repo es de la facultad y varias personas tienen write. El VPS es compartido con apps de producción. Entonces:

| Riesgo | Mitigación |
|--------|------------|
| Alguien modifica `deploy.sh` en el repo y corre como root en el VPS | El service ejecuta una **copia** en `/usr/local/bin/mdw-deploy`, no el archivo del clone. Actualizar el runner es un paso manual. |
| Alguien cambia el compose (`privileged`, montar `/` o el socket de Docker, abrir puertos) | Dos capas. **En el VPS**: antes de cada `up`, el runner renderiza el compose con `docker compose config` y aborta si aparece `privileged`, `cap_add`, `network_mode: host`, `pid/ipc: host`, `devices`, `unconfined`, `docker.sock`, `ports`, o un bind mount fuera de `/opt/mdw_TrabajoFinal`. **En GitHub**: `.github/CODEOWNERS` hace que `infra/**` y `.github/**` requieran review del dueño del VPS (activar "Require review from Code Owners" en la branch protection). |
| Llave del VPS con acceso de escritura al repo | La llave del VPS es una **deploy key read-only** dedicada a este repo. Nunca la llave personal. |
| Fuga de `.env` | El script se niega a correr si `.env` no es `root:600`. |
| Force-push a `main` | `git merge --ff-only`: si `main` fue reescrita, el deploy se detiene y avisa. Branch protection también lo bloquea. |
| Deploy de un commit que no pasó CI | Check requerido de CI en la branch protection. El VPS solo despliega lo que está en `main`. |

Lo que NO cubre: código malicioso dentro de la app (un endpoint que lea `/etc`). Eso corre dentro del container con límites y `no-new-privileges`, sin acceso a otras redes del VPS. Es el mismo riesgo que cualquier app desplegada.

### Requisitos

- El clone en `/opt/mdw_TrabajoFinal` tiene que poder hacer `git ls-remote origin` sin interacción: deploy key **de solo lectura** y sin passphrase, dedicada a este repo. Probar con `git ls-remote origin main` como root.
- `.env` con `chown root:root .env && chmod 600 .env`.
- `curl` y `flock` instalados (vienen en Debian/Ubuntu base).

### Instalación (una sola vez, en el server)

```bash
cd /opt/mdw_TrabajoFinal && git pull
install -m 0755 infra/cd/deploy.sh /usr/local/bin/mdw-deploy
install -m 0644 infra/cd/mdw-deploy.service infra/cd/mdw-deploy.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now mdw-deploy.timer
systemctl list-timers mdw-deploy.timer
```

Son **copias** a propósito (ver modelo de seguridad). Si cambia algo en `infra/cd/`, repetir los dos `install` y `systemctl daemon-reload`.

### Operación

| Quiero | Comando |
|--------|---------|
| Ver qué hizo | `journalctl -u mdw-deploy -n 50` |
| Seguir un deploy en vivo | `journalctl -u mdw-deploy -f` |
| Forzar un deploy ya | `systemctl start mdw-deploy.service` |
| Pausar el CD (mantenimiento) | `systemctl stop mdw-deploy.timer` / `start` para reanudar |
| Cambiar la frecuencia | editar `OnUnitActiveSec` en el timer + `systemctl daemon-reload` |

Cuando no hay cambios el script sale sin loguear nada, así que el journal solo muestra deploys reales.

### Si un deploy falla

El script **no hace rollback automático**: loguea el error con el comando exacto de rollback y sale con 1. El container viejo sigue arriba si el build falló; si falló el health, revisar `docker compose ... logs app migrate`. Con `journalctl -u mdw-deploy -n 50` está todo.

Si alguien editó archivos trackeados a mano en el VPS, el script se niega a pisarlos y avisa. Resolver con `git stash` o `git checkout -- <archivo>` y volver a correr.

## Checklist antes de dar por terminado

- [ ] `docker ps` muestra `mdw-app` healthy y `mdw-db` healthy; `mdw-migrate` salió con 0
- [ ] `mdw-app` aparece en `docker network inspect proxy-network`
- [ ] `nginx -t` pasa con el conf de fase 2
- [ ] `https://mdw.guillermonatali.com/` responde con cert válido
- [ ] `curl -s https://mdw.guillermonatali.com/api/health` devuelve `"status":"ok"` y `"db":"ok"`

## Troubleshooting

- **502** → `docker exec global-nginx nginx -s reload`. Si sigue, confirmar que `mdw-app` está en `proxy-network`.
- **`nginx -t` falla por cert inexistente** → volver a fase 1, reload, generar cert, recién ahí fase 2.
- **`migrate` falla** → `docker compose --env-file .env -f infra/docker/docker-compose.prod.yaml logs migrate`. Casi siempre es `DATABASE_URL` mal parseada por un carácter especial en el password.
- **`migrate` falla con `Table 'mdw.xxx' doesn't exist`** en una tabla que sí existe con otras mayúsculas → la DB se inicializó sin `lower_case_table_names=1`. Con la DB vacía: `docker compose --env-file .env -f infra/docker/docker-compose.prod.yaml down && rm -rf infra/docker/db_data` y volver a levantar.
- **`mdw-db` no arranca con `Different lower_case_table_names settings`** → mismo caso: el datadir se creó con otro valor. Borrar `db_data` (solo si la DB está vacía o tenés backup) y recrear.
