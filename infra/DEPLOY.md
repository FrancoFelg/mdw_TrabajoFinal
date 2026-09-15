# Deploy de mdw en el VPS

La app corre en `/opt/mdw_TrabajoFinal` con su propio compose, detrás del Nginx central (`global-nginx`) y con cert de Let's Encrypt emitido por el Certbot central. El compose NO abre puertos: `global-nginx` alcanza al container `mdw-app` por la red `proxy-network`. La DB queda en una red aislada.

## Quick path

1. **DNS**: registro `A | mdw | 85.209.93.211`. Verificar: `dig mdw.guillermonatali.com +short`.
2. **Clonar y configurar**:
   ```bash
   git clone https://github.com/FrancoFelg/mdw_TrabajoFinal.git /opt/mdw_TrabajoFinal
   cd /opt/mdw_TrabajoFinal
   cp .env.example .env
   nano .env   # passwords SOLO alfanuméricos, completar JWT_SECRET
   ```
3. **Levantar** (siempre con `--env-file .env`, el compose no está en la raíz):
   ```bash
   docker compose --env-file .env -f infra/docker/docker-compose.prod.yaml up -d --build
   docker compose --env-file .env -f infra/docker/docker-compose.prod.yaml logs migrate   # debe terminar en 0
   docker network inspect proxy-network | grep mdw-app                     # debe aparecer
   ```
4. **Nginx solo HTTP** (fase 1):
   ```bash
   cp infra/nginx/mdw.http-only.conf /opt/nginx/conf.d/mdw.conf
   docker exec global-nginx nginx -t && docker exec global-nginx nginx -s reload
   ```
5. **Cert**:
   ```bash
   cd /opt/nginx
   docker compose run --rm --entrypoint certbot certbot \
     certonly --webroot --webroot-path=/var/www/certbot \
     -d mdw.guillermonatali.com \
     --non-interactive --agree-tos --email 22guillermonatali@gmail.com
   ```
6. **Nginx con 443** (fase 2):
   ```bash
   cp /opt/mdw_TrabajoFinal/infra/nginx/mdw.conf /opt/nginx/conf.d/mdw.conf
   docker exec global-nginx nginx -t && docker exec global-nginx nginx -s reload
   ```
7. **Verificar**:
   ```bash
   docker exec global-nginx curl -s -o /dev/null -w "%{http_code}\n" http://mdw-app:3000/
   echo | openssl s_client -connect mdw.guillermonatali.com:443 -servername mdw.guillermonatali.com 2>/dev/null | openssl x509 -noout -dates
   ```

## Detalles

| Tema | Decisión |
|------|----------|
| Container / puerto | `mdw-app` : `3000`. Es lo que usa `proxy_pass` en `infra/nginx/mdw.conf`. |
| Migraciones | Servicio `migrate` corre `prisma migrate deploy` antes de `app`. Si falla, `app` no arranca. |
| Datos de MySQL | Bind mount en `/opt/mdw_TrabajoFinal/infra/docker/db_data` (patrón del VPS). Hacer backup de esa carpeta. |
| Redeploy | `git pull && docker compose --env-file .env -f infra/docker/docker-compose.prod.yaml up -d --build`, y después **siempre** `docker exec global-nginx nginx -s reload` (Nginx cachea la IP vieja y tira 502). |
| Secretos | Solo en `/opt/mdw_TrabajoFinal/.env` del servidor (mismo `.env.example` que dev). Nunca commitear. |

## Checklist antes de dar por terminado

- [ ] `dig` devuelve `85.209.93.211`
- [ ] `docker ps` muestra `mdw-app` healthy y `mdw-db` healthy; `mdw-migrate` salió con 0
- [ ] `mdw-app` aparece en `docker network inspect proxy-network`
- [ ] `nginx -t` pasa con el conf de fase 2
- [ ] `https://mdw.guillermonatali.com/` responde con cert válido

## Troubleshooting

- **502** → `docker exec global-nginx nginx -s reload`. Si sigue, confirmar que `mdw-app` está en `proxy-network`.
- **`nginx -t` falla por cert inexistente** → volver a fase 1, reload, generar cert, recién ahí fase 2.
- **`migrate` falla** → `docker compose --env-file .env -f infra/docker/docker-compose.prod.yaml logs migrate`. Casi siempre es `DATABASE_URL` mal parseada por un carácter especial en el password.
