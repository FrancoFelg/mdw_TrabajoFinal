# App de Emergencias Comunitarias

API REST (Next.js + Prisma + MySQL) para coordinar la asistencia a personas en situación de vulnerabilidad en la vía pública. Permite reportar emergencias con su ubicación y prioridad (ROJO, AMARILLO, VERDE), que los voluntarios las tomen y las cierren, gestionar el catálogo de cursos y los certificados de capacitación de cada voluntario, y administrar los ascensos de voluntario a coordinador. Es el trabajo final de **Metodologías de Desarrollo Web (MDW)**, UAI.

El relevamiento completo (problema, roles, entidades e historias de usuario) está en [`docs/spec.md`](docs/spec.md).

## Integrantes

| Nombre | GitHub |
| :--- | :--- |
| Franco Lamberti | [FrancoFelg](https://github.com/FrancoFelg) |
| Guillermo Natali Ulla | [guille-nat](https://github.com/guille-nat) |
| Federico Gonzalvez Rolon | — |
| Lucas Ciolfi | [CiolfiLucas](https://github.com/CiolfiLucas) |

## Entornos

| Entorno | URL base | Cómo se actualiza |
| :--- | :--- | :--- |
| Producción (VPS) | `https://mdw.guillermonatali.com` | CD por pull desde `main` cada 5 minutos ([`infra/DEPLOY.md`](infra/DEPLOY.md)) |
| Local | `http://localhost:3000` | `pnpm dev` (ver [Desarrollo local](#desarrollo-local)) |

Verificar que producción está viva:

```bash
curl https://mdw.guillermonatali.com/api/health
```

```json
{ "status": "ok", "db": "ok", "dbLatencyMs": 4, "uptimeSeconds": 3120, "timestamp": "2026-10-06T15:00:00.000Z" }
```

Si la base no responde devuelve `503` con `{"status":"degraded","db":"unreachable",...}`.

## Uso rápido de la API

La autenticación es con **JWT en el header `Authorization: Bearer <token>`**. El token dura 8 horas y lleva `id`, `nombreUsuario` y `rol` (`ADMIN`, `COORDINADOR` o `VOLUNTARIO`).

**1. Registrar una cuenta** (público; el rol por defecto es `VOLUNTARIO`):

```bash
curl -X POST https://mdw.guillermonatali.com/api/usuarios \
  -H "Content-Type: application/json" \
  -d '{
    "nombreUsuario": "mariaperez",
    "password": "Secreta123",
    "persona": { "nombre": "María", "apellido": "Pérez", "fechaNac": "1998-04-12" }
  }'
```

**2. Iniciar sesión y guardar el token:**

```bash
curl -X POST https://mdw.guillermonatali.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{ "nombreUsuario": "mariaperez", "password": "Secreta123" }'
```

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": { "id": "cm...", "nombreUsuario": "mariaperez", "rol": "VOLUNTARIO" }
}
```

```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**3. Primer request autenticado:**

```bash
curl https://mdw.guillermonatali.com/api/usuarios/me -H "Authorization: Bearer $TOKEN"
```

Convenciones generales:

- Los errores devuelven `{ "error": "mensaje" }`. Los endpoints de cursos y atributos de cursos agregan además `"codigo"` (por ejemplo `FECHA_INVALIDA`).
- Sin token o con token inválido: `401`. Con token pero sin el rol necesario: `403`.
- "Coordinador" en esta guía significa rol `COORDINADOR` o `ADMIN`.
- Los ids son strings (cuid). Las fechas se mandan en formato ISO (`2026-10-06` o `2026-10-06T15:00:00Z`).
- Los ejemplos de respuesta están resumidos; las respuestas reales traen todos los campos del modelo (ver [`prisma/schema.prisma`](prisma/schema.prisma)).

## Referencia de endpoints

| Recurso | Endpoints |
| :--- | :--- |
| [Auth](#auth) | `POST /api/auth/login`, `POST /api/auth/logout` |
| [Usuarios](#usuarios) | `POST /api/usuarios`, `GET /api/usuarios`, `GET /api/usuarios/me`, `PATCH /api/usuarios/me` |
| [Solicitudes de ascenso](#solicitudes-de-ascenso) | `POST /api/solicitudes-ascenso`, `GET /api/solicitudes-ascenso`, `GET /api/solicitudes-ascenso/:id`, `POST /api/solicitudes-ascenso/:id/aprobar`, `POST /api/solicitudes-ascenso/:id/rechazar` |
| [Cursos](#cursos) | `GET/POST /api/cursos`, `GET/PATCH/PUT/DELETE /api/cursos/:id` |
| [Atributos de curso](#atributos-de-curso) | `GET/POST /api/cursos-atributos`, `GET/DELETE /api/cursos-atributos/:id` |
| [Certificados](#certificados) | `GET/POST /api/certificados`, `GET/PUT/PATCH/DELETE /api/certificados/:id` |
| [Atributos de certificado](#atributos-de-certificado) | `GET/POST /api/certificados-atributos` |
| [Emergencias](#emergencias) | `POST/GET /api/emergencias`, `GET /api/emergencias/:id`, `POST /api/emergencias/:id/tomar`, `PUT /api/emergencias/:id/finalizar` |
| [Health](#health) | `GET /api/health` |

> Los ejemplos usan `$TOKEN` (ver [Uso rápido](#uso-rápido-de-la-api)) y la URL de producción.

---

### Auth

#### `POST /api/auth/login`

Público. Devuelve el token JWT y los datos básicos del usuario.

| Campo | Tipo | Obligatorio |
| :--- | :--- | :--- |
| `nombreUsuario` | string | Sí |
| `password` | string | Sí |

Respuesta `200`: `{ "token": "...", "usuario": { "id", "nombreUsuario", "rol" } }` (ver ejemplo en Uso rápido).

Errores: `400` falta `nombreUsuario` o `password` · `401` usuario o contraseña incorrectos.

#### `POST /api/auth/logout`

**No valida el token** (no hace falta mandarlo). Responde `200` con `{ "mensaje": "Sesión cerrada correctamente." }` y borra una cookie `token`. Como la API autentica solo por header `Bearer`, el logout real es **descartar el token en el cliente**; el JWT sigue siendo válido hasta que vence (8 h).

```bash
curl -X POST https://mdw.guillermonatali.com/api/auth/logout
```

---

### Usuarios

#### `POST /api/usuarios` — Registrar cuenta

Público.

| Campo | Tipo | Obligatorio |
| :--- | :--- | :--- |
| `nombreUsuario` | string (único) | Sí |
| `password` | string | Sí |
| `persona.nombre` | string | Sí |
| `persona.apellido` | string | Sí |
| `persona.fechaNac` | fecha ISO | Sí |
| `persona.telefonos` | `[{ "tipo": string, "numero": string }]` | No |
| `rol` | `VOLUNTARIO` \| `COORDINADOR` \| `ADMIN` | No (default `VOLUNTARIO`) |

Respuesta `201` (sin `password`):

```json
{
  "id": "cm...", "nombreUsuario": "mariaperez", "rol": "VOLUNTARIO", "personaId": "cm...",
  "persona": { "nombre": "María", "apellido": "Pérez", "fechaNac": "1998-04-12T00:00:00.000Z", "telefonos": [] }
}
```

Errores: `400` faltan campos obligatorios · `409` el nombre de usuario ya existe.

> Atención: el código acepta `rol` en este endpoint público sin validar quién lo manda.

#### `GET /api/usuarios` — Listar usuarios

Cualquier usuario autenticado (el código no exige rol de coordinador).

```bash
curl https://mdw.guillermonatali.com/api/usuarios -H "Authorization: Bearer $TOKEN"
```

```json
[{ "id": "cm...", "nombreUsuario": "mariaperez", "rol": "VOLUNTARIO", "creadoEn": "2026-10-06T15:00:00.000Z",
   "persona": { "nombre": "María", "apellido": "Pérez", "fechaNac": "1998-04-12T00:00:00.000Z", "telefonos": [] } }]
```

Errores: `401`.

#### `GET /api/usuarios/me` — Mi perfil

Autenticado. Devuelve el usuario con `persona` y `telefonos`, sin `password`. Errores: `401` · `500` si el usuario del token ya no existe.

#### `PATCH /api/usuarios/me` — Actualizar mi perfil

Autenticado. Solo se modifican los datos de `persona`.

| Campo | Tipo | Obligatorio |
| :--- | :--- | :--- |
| `persona.nombre` | string | No |
| `persona.apellido` | string | No |
| `persona.fechaNac` | fecha ISO | No |
| `persona.telefonos` | `[{ "tipo", "numero" }]` | No (reemplaza la lista completa anterior) |

```bash
curl -X PATCH https://mdw.guillermonatali.com/api/usuarios/me \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "persona": { "telefonos": [{ "tipo": "celular", "numero": "1155551234" }] } }'
```

Respuesta `200`: el usuario actualizado. Errores: `401` · `400` body inválido o error al actualizar (el mensaje viene en `error`).

---

### Solicitudes de ascenso

Un voluntario pide ser coordinador; un coordinador la aprueba o la rechaza. Estados: `PENDIENTE`, `APROBADO`, `RECHAZADO`.

#### `POST /api/solicitudes-ascenso` — Crear solicitud

Autenticado. Sin body: la solicitud se crea para el usuario del token.

```bash
curl -X POST https://mdw.guillermonatali.com/api/solicitudes-ascenso -H "Authorization: Bearer $TOKEN"
```

Respuesta `201`: `{ "id": "cm...", "usuarioId": "cm...", "estado": "PENDIENTE", "creadoEn": "..." }`

Errores: `401` · `409` ya existe una solicitud pendiente.

#### `GET /api/solicitudes-ascenso` — Listar solicitudes

Coordinador. Devuelve todas, más nuevas primero, con el `usuario` incluido. Errores: `401` · `403`.

#### `GET /api/solicitudes-ascenso/:id` — Detalle

Coordinador. Errores: `401` · `403` · `404` solicitud no encontrada.

#### `POST /api/solicitudes-ascenso/:id/aprobar` y `/rechazar`

Coordinador. Sin body. Aprobar pasa la solicitud a `APROBADO` y cambia el rol del usuario a `COORDINADOR`; rechazar la pasa a `RECHAZADO`.

```bash
curl -X POST https://mdw.guillermonatali.com/api/solicitudes-ascenso/<id>/aprobar -H "Authorization: Bearer $TOKEN"
```

Respuesta `200`: la solicitud actualizada. Errores: `401` · `403` · `404` · `409` la solicitud no está pendiente (aprobar también: `409` si el usuario ya es coordinador).

---

### Cursos

Los cursos usan baja lógica: los eliminados no aparecen en los listados.

| Método y ruta | Rol | Qué hace |
| :--- | :--- | :--- |
| `GET /api/cursos` | Autenticado | Catálogo (más nuevos primero), con sus atributos vigentes |
| `GET /api/cursos/:id` | Autenticado | Detalle |
| `POST /api/cursos` | Coordinador | Crear |
| `PATCH /api/cursos/:id` (alias `PUT`) | Coordinador | Editar datos y/o atributos |
| `DELETE /api/cursos/:id` | Coordinador | Baja lógica; responde `{ "mensaje": "Curso eliminado correctamente." }` |

Campos de `POST /api/cursos`:

| Campo | Tipo | Obligatorio |
| :--- | :--- | :--- |
| `titulo` | string | Sí |
| `descripcion` | string | Sí |
| `fechaDesde` | fecha ISO | Sí |
| `fechaHasta` | fecha ISO (no anterior a `fechaDesde`) | Sí |
| `atributos` | `[{ "campoId": string, "dato": string, "fechaHasta"?: fecha }]` | No |

Cada `campoId` debe ser un atributo existente de `/api/cursos-atributos` y no puede repetirse.

```bash
curl -X POST https://mdw.guillermonatali.com/api/cursos \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "titulo": "Primeros auxilios básicos",
    "descripcion": "Curso introductorio de RCP y control de hemorragias.",
    "fechaDesde": "2026-11-01",
    "fechaHasta": "2026-12-15",
    "atributos": [{ "campoId": "<id-atributo>", "dato": "Cruz Roja" }]
  }'
```

```json
{
  "id": "cm...", "titulo": "Primeros auxilios básicos", "descripcion": "Curso introductorio de RCP y control de hemorragias.",
  "fechaDesde": "2026-11-01T00:00:00.000Z", "fechaHasta": "2026-12-15T00:00:00.000Z",
  "cursosRelAtributos": [{ "campoId": "<id-atributo>", "dato": "Cruz Roja", "campos": { "nombre": "Entidad emisora", "tipo": "TEXTO" } }]
}
```

`PATCH /api/cursos/:id` acepta cualquier subconjunto de `titulo`, `descripcion`, `fechaDesde`, `fechaHasta` y `atributos`. Si se envía `atributos`, **reemplaza** el conjunto vigente completo.

Errores comunes (cuerpo `{ "error", "codigo" }`):

| Status | `codigo` |
| :--- | :--- |
| 400 | `BODY_INVALIDO`, `CAMPOS_OBLIGATORIOS_FALTANTES`, `FECHA_INVALIDA`, `RANGO_FECHAS_INVALIDO`, `TITULO_VACIO`, `DESCRIPCION_VACIA`, `ATRIBUTOS_DEBE_SER_LISTA`, `ATRIBUTO_INCOMPLETO_CAMPO_Y_DATO_REQUERIDOS`, `ATRIBUTO_DUPLICADO`, `FECHA_ATRIBUTO_INVALIDA`, `SIN_CAMBIOS` (PATCH sin campos) |
| 401 / 403 | sin token / rol insuficiente |
| 404 | `CURSO_NO_ENCONTRADO`, `ATRIBUTO_NO_ENCONTRADO` |

---

### Atributos de curso

Paramétrica de los atributos que se pueden cargar en un curso (por ejemplo "Entidad emisora", "Nivel").

| Método y ruta | Rol | Qué hace |
| :--- | :--- | :--- |
| `GET /api/cursos-atributos` | Autenticado | Listar (orden alfabético) |
| `GET /api/cursos-atributos/:id` | Autenticado | Detalle (`404 ATRIBUTO_NO_ENCONTRADO`) |
| `POST /api/cursos-atributos` | Coordinador | Crear |
| `DELETE /api/cursos-atributos/:id` | Coordinador | Baja lógica; `409 ATRIBUTO_EN_USO` si algún curso lo usa |

Campos de `POST`:

| Campo | Tipo | Obligatorio |
| :--- | :--- | :--- |
| `nombre` | string (único) | Sí |
| `tipo` | `TEXTO` \| `NUMERO` \| `FECHA` \| `BOOLEANO` | No (default `TEXTO`) |

```bash
curl -X POST https://mdw.guillermonatali.com/api/cursos-atributos \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "nombre": "Entidad emisora", "tipo": "TEXTO" }'
```

Respuesta `201`: `{ "id": "cm...", "nombre": "Entidad emisora", "tipo": "TEXTO", ... }`. Errores: `400` `EL_NOMBRE_ES_REQUERIDO` / `TIPO_INVALIDO` · `409` `ATRIBUTO_EXISTENTE` · `401` · `403`.

---

### Certificados

Comprobantes de capacitación de un usuario. Estados: `PENDIENTE` (default), `APROBADO`, `RECHAZADO`, `VENCIDO`. Con baja lógica.

| Método y ruta | Rol (según el código) | Qué hace |
| :--- | :--- | :--- |
| `GET /api/certificados` | **Sin autenticación** | Listar todos los certificados vigentes (de todos los usuarios) |
| `GET /api/certificados/:id` | **Sin autenticación** | Detalle (`404` si no existe) |
| `POST /api/certificados` | Autenticado | Crear |
| `PATCH /api/certificados/:id` | Coordinador | Aprobar o rechazar un certificado pendiente |
| `PUT /api/certificados/:id` | **Sin autenticación** | Actualizar `estado` y/o `codigoVerificacion` |
| `DELETE /api/certificados/:id` | **Sin autenticación** | Baja lógica; body `{ "usuarioEliminacionId": string }` obligatorio (`400` si falta) |

Campos de `POST /api/certificados`:

| Campo | Tipo | Obligatorio |
| :--- | :--- | :--- |
| `usuarioId` | string (dueño del certificado) | Sí |
| `codigoVerificacion` | string (único) | Sí |
| `cursoId` | string | No |
| `estado` | enum de estados | No (default `PENDIENTE`) |
| `atributos` | `[{ "campoId": string, "dato": string, "fechaHasta"?: fecha }]` | No |

```bash
curl -X POST https://mdw.guillermonatali.com/api/certificados \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "usuarioId": "<mi-id>", "codigoVerificacion": "RCP-2026-0001", "cursoId": "<id-curso>" }'
```

```json
{
  "id": "cm...", "cursoId": "<id-curso>", "usuarioId": "<mi-id>", "codigoVerificacion": "RCP-2026-0001",
  "estado": "PENDIENTE", "fechaEmision": "2026-10-06T15:00:00.000Z", "certificadosRelAtributos": []
}
```

Errores `POST`: `401` · `400` faltan `usuarioId` o `codigoVerificacion` (el mensaje también menciona `estadoId`, que ya no es un campo del modelo) · `500` para cualquier otro error, por ejemplo `codigoVerificacion` repetido.

`PATCH /api/certificados/:id` (coordinador):

| Campo | Tipo | Obligatorio |
| :--- | :--- | :--- |
| `estado` | `APROBADO` \| `RECHAZADO` | Sí |

```bash
curl -X PATCH https://mdw.guillermonatali.com/api/certificados/<id> \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "estado": "APROBADO" }'
```

Errores: `401` · `403` · `400` falta `estado` o valor distinto de `APROBADO`/`RECHAZADO` · `404` · `422` el certificado no está en `PENDIENTE`.

---

### Atributos de certificado

| Método y ruta | Rol (según el código) | Qué hace |
| :--- | :--- | :--- |
| `GET /api/certificados-atributos` | **Sin autenticación** | Listar atributos vigentes |
| `POST /api/certificados-atributos` | Autenticado | Crear; body `{ "nombre": string }` (obligatorio) |

```bash
curl -X POST https://mdw.guillermonatali.com/api/certificados-atributos \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{ "nombre": "Horas lectivas" }'
```

Respuesta `201`: `{ "id": "cm...", "nombre": "Horas lectivas", "tipo": "TEXTO", ... }`. Errores: `401` · `500` ante cualquier fallo (incluido `nombre` vacío o repetido).

---

### Emergencias

Estados: `SIN_GESTIONAR` → `EN_CAMINO` → `GESTIONADA` (también existe `CANCELADA`, sin endpoint que lo asigne). Prioridades: `ROJO`, `AMARILLO`, `VERDE`.

| Método y ruta | Rol (según el código) | Qué hace |
| :--- | :--- | :--- |
| `POST /api/emergencias` | Autenticado | Reportar una emergencia |
| `GET /api/emergencias` | Autenticado | Listar (más nuevas primero) con `ubicacion` y voluntarios asignados |
| `GET /api/emergencias/:id` | Autenticado | Detalle (`404` si no existe) |
| `POST /api/emergencias/:id/tomar` | Autenticado | Asignársela y pasar a `EN_CAMINO` |
| `PUT /api/emergencias/:id/finalizar` | Autenticado (el voluntario asignado) | Pasar a `GESTIONADA` |

> `docs/api.md` marca el reporte de emergencias como público, pero el código **exige token** en `POST /api/emergencias`.

#### `POST /api/emergencias`

| Campo | Tipo | Obligatorio |
| :--- | :--- | :--- |
| `descripcion` | string | Sí |
| `fecha` | fecha ISO | Sí |
| `prioridad` | `ROJO` \| `AMARILLO` \| `VERDE` | Sí |
| `provincia` | enum de provincias en mayúsculas con `_` (`BUENOS_AIRES`, `CABA`, `CORDOBA`, `SANTA_FE`, `TIERRA_DEL_FUEGO`, ...). Lista completa en [`prisma/schema.prisma`](prisma/schema.prisma) | Sí |
| `coordenada_x` | number | No |
| `coordenada_y` | number | No |
| `imagen` | string | No |

```bash
curl -X POST https://mdw.guillermonatali.com/api/emergencias \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "descripcion": "Persona inconsciente en la vereda",
    "fecha": "2026-10-06T15:30:00Z",
    "prioridad": "ROJO",
    "provincia": "CABA",
    "coordenada_x": -34.6037,
    "coordenada_y": -58.3816
  }'
```

```json
{
  "id": "cm...", "descripcion": "Persona inconsciente en la vereda", "fecha": "2026-10-06T15:30:00.000Z",
  "prioridad": "ROJO", "estado": "SIN_GESTIONAR", "imagen": null,
  "ubicacion": { "id": "cm...", "coordenada_x": -34.6037, "coordenada_y": -58.3816, "provincia": "CABA" }
}
```

Errores: `401` · `400` faltan `descripcion`, `fecha`, `prioridad` o `provincia` · `500` para valores de enum inválidos.

#### `POST /api/emergencias/:id/tomar`

Sin body. Regla de negocio: la emergencia debe estar `SIN_GESTIONAR`, el voluntario no puede tener otra `EN_CAMINO`, y si la prioridad es `ROJO` necesita al menos un certificado `APROBADO`.

```bash
curl -X POST https://mdw.guillermonatali.com/api/emergencias/<id>/tomar -H "Authorization: Bearer $TOKEN"
```

```json
{ "mensaje": "Emergencia tomada con éxito.",
  "datos": { "mensaje": "Emergencia asignada exitosamente.", "emergenciaId": "cm...", "estado": "EN_CAMINO" } }
```

Errores: `401` · `409` la emergencia ya fue asignada o no está `SIN_GESTIONAR` · `400` el voluntario ya tiene una emergencia activa · `500` en los demás casos, incluidos emergencia inexistente y falta de certificado aprobado en prioridad `ROJO` (el código no los traduce a un status específico).

#### `PUT /api/emergencias/:id/finalizar`

Sin body (el informe de atención todavía no se guarda). Solo el voluntario que la tomó.

```bash
curl -X PUT https://mdw.guillermonatali.com/api/emergencias/<id>/finalizar -H "Authorization: Bearer $TOKEN"
```

Respuesta `200`: `{ "mensaje": "Emergencia finalizada con éxito." }`

Errores: `401` · `400` la emergencia no está `EN_CAMINO` · `403` no sos el voluntario asignado · `500` si la emergencia no existe.

---

### Health

`GET /api/health` — Público. Ver [Entornos](#entornos). `200` si el proceso y la base responden, `503` si la base no.

## Desarrollo local

Requisitos: Node.js, pnpm (el `package.json` declara `pnpm@11.7.0`) y Docker.

```bash
# 1. Levantar MySQL (puerto 3307, base mdw_dev, usuario mdw_user / mdw_pass)
docker compose -f infra/docker/docker-compose.dev.yaml up -d

# 2. Variables de entorno
cp .env.example .env        # en PowerShell: Copy-Item .env.example .env
# Completar JWT_SECRET (por ejemplo: openssl rand -hex 64)

# 3. Dependencias, migraciones y servidor
pnpm install
npx prisma migrate deploy
pnpm dev
```

La API queda en `http://localhost:3000`. Scripts disponibles: `dev`, `build`, `start`, `lint`.

Notas:

- `JWT_SECRET` es obligatorio: con él se firman y verifican los tokens.
- En Windows, si Prisma no llega a `localhost:3307`, usá `127.0.0.1` en `DATABASE_URL` (`mysql://mdw_user:mdw_pass@127.0.0.1:3307/mdw_dev`): `localhost` resuelve primero a IPv6.

## Documentación

| Documento | Contenido |
| :--- | :--- |
| [`docs/spec.md`](docs/spec.md) | Relevamiento: problema, roles, entidades, historias de usuario |
| [`docs/api.md`](docs/api.md) | Tabla de endpoints planificados por historia de usuario |
| [`infra/DEPLOY.md`](infra/DEPLOY.md) | Infraestructura y despliegue en el VPS |
