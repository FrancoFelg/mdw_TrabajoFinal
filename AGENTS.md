<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# mdw — App de Emergencias Comunitarias

Guía para cualquier agente (o persona) que trabaje en este repo. Antes de escribir código, leé la sección que corresponde a lo que vas a tocar. Si algo de acá contradice al código, **el código manda y este archivo se corrige** en el mismo PR.

## 1. Qué es

Sistema para coordinar la asistencia a personas en situación de calle o vulnerabilidad en la vía pública. Un transeúnte reporta una emergencia geolocalizada sin crear cuenta; un voluntario la toma (`EN_CAMINO`) y la cierra con un informe (`GESTIONADA`); los coordinadores validan certificados de capacitación, administran cursos y aprueban ascensos. Los casos `ROJO` solo los puede tomar quien tenga un certificado `APROBADO`.

Es el trabajo final de **Metodologías de Desarrollo Web (MDW), UAI**. Equipo: Franco Lamberti (`FrancoFelg`), Guillermo Natali Ulla (`guille-nat`), Federico Gonzalvez Rolon, Lucas Ciolfi (`CiolfiLucas`).

## 2. Fuentes de verdad (en orden)

| Tema | Archivo | Regla |
| :--- | :--- | :--- |
| Requerimientos, roles, entidades, historias, reglas de negocio | `docs/spec.md` | **Si no está en la spec, no se implementa.** Si hace falta algo nuevo, primero se agrega a la spec. |
| Producto, usuarios, voz, principios | `PRODUCT.md` | Manda en decisiones de producto y tono. |
| Sistema visual | `DESIGN.md` (todavía no existe) + tokens en `src/app/globals.css` | Hasta que exista DESIGN.md, el CSS y los componentes de `src/components/ui` son la referencia. |
| Contrato de la API | `docs/api.md` y `README.md` | Se actualizan en el mismo PR que cambia un endpoint. |
| Interfaz: sesión, componentes, verificación | `docs/ui.md` | Se actualiza al sumar pantallas. |
| Modelo de datos | `prisma/schema.prisma` | Es la verdad de las tablas y enums. |
| Deploy | `infra/DEPLOY.md` | |

**Descripciones viejas del enunciado:** la consigna original menciona PostgreSQL y solo dos estados de emergencia. No aplica: la base es **MySQL 8.4** y los estados son `SIN_GESTIONAR`, `EN_CAMINO`, `GESTIONADA`, `CANCELADA` (ver schema).

## 3. Stack y comandos

- **Next.js 16 (App Router) + React 19 + TypeScript**: frontend y backend en el mismo proyecto.
- **Prisma 5 + MySQL 8.4** (`lower_case_table_names=1`, igual que prod).
- **Zod 4** para validar entradas; **jsonwebtoken** (8 h) y **bcrypt** para auth.
- **pnpm** es el gestor (`packageManager` en `package.json`). `package-lock.json` es un resto: no usar npm.

```bash
cp .env.example .env                                   # completar JWT_SECRET (openssl rand -hex 64)
docker compose -f infra/docker/docker-compose.dev.yaml up -d --wait   # MySQL dev en localhost:3307
pnpm install
pnpm prisma migrate deploy && pnpm prisma generate
pnpm seed                                              # opcional: datos de demo (cuentas demo.*, clave demo12345)
pnpm dev                                               # http://localhost:3000
```

`pnpm seed` (`prisma/seed.ts`) carga datos ficticios para probar la interfaz: 9 cuentas `demo.*` (admin, coordinación y voluntarios), cursos, certificados en los tres estados, pedidos de ascenso y 11 emergencias en CABA y el GBA con distintas prioridades y estados. Se puede correr varias veces (reemplaza las emergencias de demo, con id `cmdemo…`) y se niega a correr contra una base que no sea local salvo con `SEED_FORZAR=1`. No agrega fotos ni audios: no se inventan imágenes de personas.

Antes de abrir un PR corré lo mismo que el CI: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`.

Para crear una migración: cambiar `prisma/schema.prisma` y correr `pnpm prisma migrate dev --name <descripcion>`. **Nunca** editar a mano una migración ya mergeada. El CI aplica todas las migraciones sobre un MySQL limpio y falla si la base resultante no coincide con el schema.

Variables (`.env.example` las documenta): `DATABASE_URL` (solo dev; en prod la arma el compose), `JWT_SECRET` (obligatoria: sin ella no se emiten ni verifican tokens), `GOOGLE_MAPS_API_KEY` (opcional; sin ella los endpoints de direcciones y ETA devuelven 503). `ALMACENAMIENTO_PROVEEDOR` (`local` por defecto, `s3` o `azure`) y sus variables: dónde se guardan las fotos y audios de los reportes (`services/almacenamiento.ts`). En prod, `local` usa el volumen `archivos` del compose. `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `VAPID_SUBJECT` (opcionales): claves para mandar avisos push (historia 12); sin ellas los avisos quedan solo dentro de la app. Se generan con `node -e "console.log(require('web-push').generateVAPIDKeys())"` y no se cambian una vez en uso (invalidan las suscripciones). El `.env` real nunca se commitea.

## 4. Estructura del repo

```
src/app/                 Rutas de Next: páginas, layouts y route handlers
  api/<recurso>/         API REST (route.ts por endpoint)
  actions/               Server Actions del frontend (login, registro…)
  (privado)/             Páginas que exigen sesión (layout con requireSession)
src/components/          UI compartida; src/components/ui = primitivas (Button, Card, Badge, Input, Alert, Skeleton)
src/features/<dominio>/  UI propia de un dominio (hoy: salud → PanelSalud)
src/lib/                 auth.ts (JWT desde request), session.ts (cookie de sesión), cursoErrores.ts (errores → HTTP)
controllers/             Fachada delgada entre route handler y service
services/                Lógica de negocio y validación (Zod). También googleMaps.client, geocoding, rutas
repositories/            Acceso a datos con Prisma (única capa que toca `db`)
config/database.ts       Instancia de PrismaClient (`db`)
prisma/                  schema.prisma + migrations/
infra/                   Docker (dev/prod), nginx, CD pull-based
docs/                    spec.md, api.md, ui.md
```

Restos que **no** hay que usar ni copiar: `middleware/auth.middleware.ts` y `src/types/express.d.ts` (de una etapa con Express; la app no los importa) y `src/lib/schemas.ts` (Zod viejo con ids uuid y estados con espacios; no lo importa nadie). `src/lib/README.md` dice que el cliente de base está "pendiente": ya se eligió Prisma.

Import alias: `@/*` → `src/*`. Lo que está fuera de `src/` (`services/`, `repositories/`, `controllers/`, `config/`) se importa con ruta relativa.

## 5. Backend

### Capas

`route.ts` → (`controller`) → `service` → `repository` → `db`.

- **Route handler:** autentica, chequea rol, lee el body, llama y traduce errores a HTTP. Sin lógica de negocio.
- **Service:** valida con Zod, aplica reglas de negocio, lanza `new Error('CODIGO_EN_MAYUSCULAS')` cuando algo no se puede.
- **Repository:** queries Prisma. Nada de reglas ni HTTP.

Seguí el patrón del recurso más parecido al que vas a tocar (cursos es el más prolijo: `src/app/api/cursos`, `controllers/curso.controller.ts`, `services/curso.service.ts`, `src/lib/cursoErrores.ts`).

### Auth y roles

- Roles: `ADMIN`, `COORDINADOR`, `VOLUNTARIO` (default al registrarse). "Coordinador" en reglas y docs = `COORDINADOR` o `ADMIN` → `esCoordinadorOAdmin()`.
- `getUserFromRequest(req)` (`src/lib/auth.ts`) acepta `Authorization: Bearer <token>` **o** la cookie `token` (navegador). Devuelve `{ id, nombreUsuario, rol }` o `null`.
- Sin token o token inválido → `401`. Token sin el rol necesario → `403`. Usar `RESPUESTA_NO_AUTORIZADO()` / `RESPUESTA_PROHIBIDO()`.
- Regla para endpoints nuevos: los datos de una persona (certificados, solicitudes) los lee su dueño o un coordinador. **Pendiente conocido:** `GET /api/certificados` hoy no pide token y lista todos; no tomarlo como patrón.

### Errores y respuestas

- Error: `{ "error": "mensaje para humanos" }`. Cursos y atributos agregan `"codigo"`. Mensajes en español.
- Códigos: `400` datos inválidos · `401` · `403` · `404` no existe · `409` conflicto de estado (p. ej. emergencia ya tomada) · `422` regla de negocio incumplida · `500` inesperado (loguear con `console.error` y devolver mensaje genérico) · `503` dependencia caída (DB, Google Maps).
- Mapear códigos de negocio en un diccionario como `ERRORES_NEGOCIO` de `cursoErrores.ts`, no con `if` sueltos.

### Datos

- Ids `cuid` (string). Fechas en ISO.
- Entidades de catálogo usan **baja lógica y auditoría**: `fechaCreacion`, `usuarioCreacionId`, `fechaEliminacion`, `usuarioEliminacionId`. Borrar = setear `fechaEliminacion`; los listados filtran `fechaEliminacion: null`.
- Atributos dinámicos (cursos y certificados): catálogo `*Atributo(s)` con `tipo` (`TEXTO`, `NUMERO`, `FECHA`, `BOOLEANO`) + tabla `*RelAtributos` con el valor (`dato`) por entidad.
- Emergencia: `Ubicacion` guarda `coordenada_x` = **longitud**, `coordenada_y` = **latitud**, más `provincia` (enum). La asignación voluntario↔emergencia vive en `UsuarioEmergencia`.

### Reglas de negocio que el backend garantiza (`docs/spec.md` §6)

1. Reportar una emergencia no requiere cuenta; tomarla sí. Nace `SIN_GESTIONAR`, prioridad por defecto `VERDE`.
2. Tomar una `ROJO` exige al menos un certificado `APROBADO` (`REQUIERE_CERTIFICADO_APROBADO`).
3. Una emergencia `SIN_GESTIONAR` la toma un solo voluntario; la carrera se resuelve con `409` (`EMERGENCIA_YA_ASIGNADA` / `CONCURRENCIA_EMERGENCIA_TOMADA`).
4. Un voluntario tiene como máximo una emergencia `EN_CAMINO` (`VOLUNTARIO_CON_EMERGENCIA_ACTIVA`).
5. Solo el voluntario asignado finaliza una emergencia `EN_CAMINO`; pasa a `GESTIONADA`. La spec pide un informe final (la API hoy acepta `observaciones` opcional; la UI debe pedirlo).
6. Certificado: `curso` opcional; toda subida queda `PENDIENTE` hasta que un coordinador la aprueba o rechaza.
7. Ascenso: no se puede pedir con una solicitud `PENDIENTE` ni siendo ya coordinador; aprobar cambia el rol.

Fuera de alcance (no implementar): notificaciones por mail o SMS (los avisos en la app y el push del navegador sí están, historia 12), chat interno, inventario, donaciones, firma digital, app nativa.

### Al tocar un endpoint

Actualizar `docs/api.md` (y la tabla del `README.md` si cambia la lista) en el mismo PR, con campos, permisos y errores.

## 6. Frontend

### Lo que ya existe (base de Franco, `docs/ui.md`)

- **Sesión:** el JWT vive en una cookie `token` HttpOnly, SameSite=Lax, Secure en prod, 8 h. Nunca en `localStorage`. `getSession()` y `requireSession()` en `src/lib/session.ts`.
- **Mutaciones** desde la UI con Server Actions en `src/app/actions/` que llaman a los services. **Lecturas** desde Server Components que llaman al service directamente (como `/usuarios`), sin ir por HTTP a la propia API.
- **Páginas privadas** dentro de `src/app/(privado)/`. Si la página es por rol, chequearlo en la página y también en el endpoint.
- **Redirección post-login:** `safeDestination()` solo acepta rutas en lista blanca. Cada ruta privada nueva se agrega ahí; nunca redirigir a un `next` arbitrario.
- **Estilos:** CSS global con una sola fuente de tokens en `src/app/globals.css` (`--primary`, `--surface`, `--border`, `--danger`, `--radius`…). Sin Tailwind ni shadcn. Componentes propios sobre HTML nativo en `src/components/ui`. Galería de estados en `/sistema`: cada componente nuevo se muestra ahí.
- Pantallas implementadas y pendientes: tabla "Mapa de pantallas" en `docs/spec.md` §5.

### Reglas de la interfaz

- **Idioma y voz:** español rioplatense con voseo ("Reportá una emergencia", "Tomá el caso", "Ingresá tu usuario"). Botones con el verbo de la acción. Errores que digan qué pasó y cómo seguir.
- **Accesibilidad (requisito de la spec, no opcional):** todo operable con teclado y foco visible; `label` explícito en cada campo; contraste ≥ 4,5:1; enlace "Saltar al contenido" (ya está en el layout).
- **Prioridades nunca solo por color:** `ROJO`, `AMARILLO`, `VERDE` siempre con texto explícito **e** ícono distinto. Lo mismo para estados de emergencia y certificado.
- **Cada pantalla para su persona:**
  - Reporte público: móvil primero, **3 toques o menos**, sin login. Si falla el GPS se destaca la dirección manual sin perder lo cargado.
  - Voluntario en campo: móvil, mapa + listado de pendientes, "Tomar emergencia" grande y obvio; si otro lo tomó antes, decirlo claro (409).
  - Coordinador: escritorio, colas y tablas (certificados, ascensos, cursos, usuarios).
- **Estados de cada vista con datos:** cargando (`loading.tsx` / `Skeleton`), vacío (`SinDatos`), error con reintento (`error.tsx`), sin permiso, y con datos. Probar a 375 px.
- **No inventar contenido:** nada de testimonios, métricas, organizaciones o casos falsos. Datos de ejemplo solo en `/sistema` y sin datos personales.
- **Nombre:** el header usa "Red de Apoyo"; `PRODUCT.md` lo marca como no decidido. Confirmarlo con el equipo antes de usarlo en más lugares.

## 7. Workflow del equipo

- **Ramas:** desde `main`, con prefijo de tipo y autor: `feat/<autor>/<tema>`, `fix/<autor>/<tema>`, `docs/…`, `ci/…`. Ej.: `feat/felg/implementacion-front`, `fix/CiolfiLucas/cursos-validar-tipos`.
- **Commits:** Conventional Commits en español, con scope cuando aplica: `feat(emergencias): …`, `fix(cursos): devolver 400 si …`, `docs(api): …`.
- **PRs a `main`** con review. `main` está protegida. `infra/` y `.github/` requieren review de los CODEOWNERS (`guille-nat`, `FrancoFelg`).
- **CI** (`.github/workflows/ci.yml`): lint, typecheck, build, y migraciones vs schema. Tiene que estar verde para mergear.
- **Mergear a `main` es deployar:** el VPS hace pull de `main` cada 5 minutos, rebuildea y verifica `/api/health` (`infra/DEPLOY.md`). Producción: `https://mdw.guillermonatali.com`.
- No tocar `infra/` ni el pipeline sin avisar a los dueños del servidor.
