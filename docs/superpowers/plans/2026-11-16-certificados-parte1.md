# Certificados (parte 1) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cualquier usuario con sesión puede cargar, ver, editar y dar de baja sus certificados sin curso. Cada certificado lleva un archivo PDF o imagen y datos adicionales del catálogo EAV, y siempre nace PENDIENTE.

**Architecture:**
- **Capas:** `route.ts` (fino) → `src/lib/certificados-api.ts` (HTTP: sesión, multipart, errores; mismo patrón que `src/lib/ascensos-api.ts`) → `services/certificado.service.ts` (reglas) → `repositories/certificado.repository.ts` (Prisma) + `src/lib/archivos-certificado.ts` (disco).
- **Pantallas:** server components leen con el service. Los formularios client hacen `fetch` multipart a la API. No se usan server actions, por su límite de 1 MB de body.
- **Controller:** `controllers/certificado.controller.ts` se elimina, igual que ascensos, que no tiene controller.

**Tech Stack:** Next 16.3 App Router, React 19, Prisma 5 + MySQL, `node:test` con dobles de la base, lucide-react.

**Spec:** `docs/superpowers/specs/2026-11-16-cursos-certificados-design.md` §1–§5. Solo la parte 1: no implementar §6 ni §7.

## Global Constraints

- Antes de escribir código de Next, leer la guía relevante en `node_modules/next/dist/docs/01-app/` (`AGENTS.md`). `params` en rutas es una `Promise`.
- **Sin commits:** el usuario hace sus propios commits. Al terminar cada tarea, listar los archivos tocados y no correr `git commit`.
- **Dueño:** el dueño del certificado sale siempre de la sesión, nunca del body.
- **Estado inicial:** el estado de un certificado nuevo es siempre `PENDIENTE` y el cliente no puede fijarlo.
- **Enum:** `CertificadoEstado` = `PENDIENTE | APROBADO | RECHAZADO` (sin `VENCIDO`).
- **Archivo:** PDF (`%PDF-`), JPEG, PNG o WebP, validado por contenido. Tope `5 * 1024 * 1024` bytes. Carpeta `CERTIFICADO_UPLOAD_DIR` (default `<cwd>/.data/certificados`). Nombre en disco `<certificadoId>.archivo`.
- **Errores de negocio:** se lanzan como `new Error('CODIGO')`. La respuesta HTTP es `{ error: string, codigo: string, campo?: string }`.
- **Copy:** español rioplatense con voseo ("Cargá", "Elegí"). Estados con texto e icono, no solo color. Cada campo con `<label>` explícito.
- **Pruebas:** `node --test tests/certificados.test.cjs`, con el helper `cargar()` y dobles de `tests/ascensos.test.cjs`.
- **`@prisma/client`:** después de tocar `prisma/schema.prisma`, correr `pnpm prisma generate`. Las pruebas importan los enums reales de `@prisma/client`.

## Review Focus

1. **`atributos` con JSON mal formado** en el multipart → 400 `ATRIBUTO_VALOR_INVALIDO`, nunca 500 (test en Tarea 5).
2. **Fecha de emisión = hoy**, enviada como `YYYY-MM-DD` desde un `<input type="date">` en Argentina (UTC−3) → se acepta. "Futura" se compara por día calendario en `America/Argentina/Buenos_Aires` (test en Tarea 3).
3. **Archivo con comillas o caracteres no ASCII en el nombre** (`certificado "final" ñ.pdf`) → se guarda saneado y la descarga no rompe el header `Content-Disposition` (tests en Tareas 2 y 5).
4. **Edición que solo reemplaza el archivo**, sin otros campos → se acepta (no es `SIN_CAMBIOS`) y vuelve a PENDIENTE si estaba RECHAZADO (test en Tarea 4).
5. **Body enorme**: un `Content-Length` mayor a 6 MB → 413 antes de parsear el `formData()`, sin cargarlo en memoria (test en Tarea 5).

---

### Task 1: Modelo, migración y fin de `VENCIDO`

**Files:**
- Modify: `prisma/schema.prisma` (enum `CertificadoEstado`, modelo `Certificado`, relación `"CertificadoRevisor"` en `Usuario`)
- Create: `prisma/migrations/<timestamp>_certificados_parte1/migration.sql` (generada)
- Modify: `src/lib/schemas.ts:23-29`, `src/components/marcas.tsx:40` (y el import de `CalendarX` si queda sin uso), `src/app/sistema/page.tsx:21`

**Interfaces:**
- Produces, en el modelo `Certificado`:
  - Nuevos: `nombre String`, `entidadEmisora String`, `archivoTipo String`, `archivoNombre String`, `fechaActualizacion DateTime @updatedAt`, `motivoRechazo String? @db.Text`, `fechaRevision DateTime?`, `usuarioRevisionId String?`, `usuarioRevision Usuario? @relation("CertificadoRevisor", …)`.
  - Cambios: `fechaEmision DateTime` (sin default) y `codigoVerificacion String?` (sin `@unique`).
- Produces, en `Usuario`: `certificadosRevisados Certificado[] @relation("CertificadoRevisor")`.

- [ ] **Step 1:** Verificar que la tabla `certificado` de producción esté vacía, o pedírselo a quien maneja el VPS. Si tiene filas, frenar y avisar: la migración necesitaría valores para `nombre`, `entidadEmisora` y `archivo*`.
- [ ] **Step 2:** Editar el schema según Interfaces. Agregar `@@index([usuarioRevisionId])`.
- [ ] **Step 3:** Levantar la DB de desarrollo (`infra/docker/docker-compose.dev.yaml`) y correr `pnpm prisma migrate dev --name certificados_parte1`. Esperado: la migración se crea y se aplica sin errores, y el cliente se regenera.
- [ ] **Step 4:** Quitar `VENCIDO` de `CertificadoEstadoEnum`, del mapa `REVISION` en `marcas.tsx` y del ejemplo en `/sistema`.
- [ ] **Step 5:** Correr `pnpm exec tsc --noEmit`. Esperado: solo fallan `repositories/certificado.repository.ts`, `services/certificado.service.ts`, `controllers/certificado.controller.ts` y las rutas de certificados, que se rehacen en las Tareas 3 a 5. Ningún otro archivo debe fallar.

---

### Task 2: Almacenamiento de archivos e infraestructura

**Files:**
- Create: `src/lib/archivos-certificado.ts`
- Create: `tests/certificados.test.cjs` (primera sección)
- Modify: `.gitignore` (sumar `.data/`), `.env.example` (sumar `CERTIFICADO_UPLOAD_DIR=` comentado, con su default)
- Modify: `infra/docker/Dockerfile` (en la etapa `runner`, antes de `USER nextjs`: `RUN mkdir -p /app/.data && chown nextjs /app/.data`)
- Modify: `infra/docker/docker-compose.prod.yaml` (servicio `app`: volumen con nombre `mdw_uploads:/app/.data`, declarado en `volumes:` de nivel superior)
- Modify: `infra/nginx/mdw.conf` y `infra/nginx/mdw.http-only.conf` (`client_max_body_size 6m;` en el `server` que hace `proxy_pass`)

**Interfaces:**
- Produces (`src/lib/archivos-certificado.ts`):
  - `export const MAX_ARCHIVO = 5 * 1024 * 1024`
  - `export type TipoArchivo = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp'`
  - `export function tipoArchivo(bytes: Uint8Array): TipoArchivo | null`: magic bytes. Reutilizar `tipoFoto` de `fotos-emergencia.ts` para las imágenes y sumar PDF.
  - `export function nombreSeguro(nombre: string): string`: deja solo letras, números, espacio, `.`, `-` y `_` (Unicode permitido); recorta a 120 caracteres; devuelve `'certificado'` si queda vacío.
  - `export async function guardarArchivo(id: string, bytes: Uint8Array): Promise<void>`: valida tamaño y tipo (si no, `ARCHIVO_INVALIDO`) y escribe con temporal + rename, como `guardarFoto`.
  - `export async function leerArchivo(id: string): Promise<Buffer>`
  - `export async function borrarArchivo(id: string): Promise<void>`: no falla si el archivo no existe.
  - La ruta en disco valida `id` contra `/^[a-zA-Z0-9_-]{1,80}$/` (si no, `ID_INVALIDO`).

- [ ] **Step 1: Tests que fallan.** En `tests/certificados.test.cjs`, cargar el módulo con `cargar()` y `process.env.CERTIFICADO_UPLOAD_DIR` apuntando a un directorio de `fs.mkdtempSync(os.tmpdir())`:
  - `test('tipoArchivo reconoce pdf, jpeg, png y webp por contenido')`:
    - `tipoArchivo(Buffer.from('%PDF-1.7 …'))` → `'application/pdf'`.
    - Un `Buffer.from('hola.pdf')` → `null`.
  - `test('guardar y leer devuelve los mismos bytes; borrar es idempotente')`.
  - `test('guardarArchivo rechaza más de 5 MB y tipos inválidos')` → rejects `/ARCHIVO_INVALIDO/`.
  - `test('nombreSeguro quita comillas y separadores pero conserva la ñ')`:
    - `nombreSeguro('certificado "final" ñ.pdf')` → `'certificado final ñ.pdf'`.
    - `nombreSeguro('../../x')` no contiene `/`.
- [ ] **Step 2:** Correr `node --test tests/certificados.test.cjs`. Esperado: FAIL, porque el módulo no existe.
- [ ] **Step 3:** Implementar `src/lib/archivos-certificado.ts` según Interfaces.
- [ ] **Step 4:** Correr `node --test tests/certificados.test.cjs`. Esperado: PASS.
- [ ] **Step 5:** Hacer los cambios de infraestructura. Correr `docker compose -f infra/docker/docker-compose.prod.yaml config -q`. Esperado: sin errores. Avisar al usuario que la configuración de nginx se copia a mano al VPS (ver el comentario del archivo).

---

### Task 3: Repositorio y servicio — alta, listado y detalle

**Files:**
- Modify (rehacer): `repositories/certificado.repository.ts`
- Modify (rehacer): `services/certificado.service.ts`
- Delete: `controllers/certificado.controller.ts`
- Test: `tests/certificados.test.cjs`

**Interfaces:**
- Consumes: `guardarArchivo`, `borrarArchivo`, `tipoArchivo`, `nombreSeguro` y `MAX_ARCHIVO` (Tarea 2). `CertificadoAtributoRepository.findAll()` (ya existe; devuelve `{ id, nombre, tipo }[]` vigentes).
- Produces (service):
  ```ts
  export interface Solicitante { id: string; rol?: Rol }
  export interface ArchivoEntrada { bytes: Uint8Array; nombre: string }
  export interface CertificadoEntrada {          // todo string sin normalizar, como llega del form
    nombre?: unknown; entidadEmisora?: unknown; fechaEmision?: unknown;
    codigoVerificacion?: unknown; cursoId?: unknown;
    atributos?: { campoId?: unknown; dato?: unknown }[];
  }
  export interface FiltroCertificados { estado?: CertificadoEstado; usuarioId?: string }
  class CertificadoService {
    crear(entrada: CertificadoEntrada, archivo: ArchivoEntrada | null, solicitante: Solicitante): Promise<CertificadoDetalle>
    listar(filtro: FiltroCertificados, solicitante: Solicitante): Promise<CertificadoDetalle[]>
    obtener(id: string, solicitante: Solicitante): Promise<CertificadoDetalle>
    cambiarEstado(id: string, estado: CertificadoEstado): Promise<CertificadoDetalle>   // se conserva como está hoy
  }
  export function validarDatoAtributo(tipo: AtributoTipo, dato: unknown): string   // normaliza o lanza ATRIBUTO_VALOR_INVALIDO
  ```
- Produces (repo): `CertificadoDetalle` = `Certificado` + `certificadosRelAtributos` vigentes con `campos`. Métodos:
  - `crearConArchivo(data, escribir: (id: string) => Promise<void>)`: `db.$transaction`; crea la fila con sus atributos; llama a `escribir(id)` dentro de la transacción.
  - `findAll(filtro)`: `fechaEliminacion: null`, `orderBy fechaCreacion desc`.
  - `findById(id)`.
  - `actualizar` y `eliminar` (Tarea 4).
- Reglas de `crear`:
  - Obligatorios: `nombre`, `entidadEmisora`, `fechaEmision` → `CAMPOS_OBLIGATORIOS_FALTANTES`.
  - Archivo ausente → `ARCHIVO_REQUERIDO`. Más de `MAX_ARCHIVO` → `ARCHIVO_DEMASIADO_GRANDE`. Tipo no reconocido → `ARCHIVO_INVALIDO`.
  - `cursoId` presente → `CURSO_NO_DISPONIBLE`.
  - Fecha inválida o posterior a hoy en `America/Argentina/Buenos_Aires` → `FECHA_INVALIDA`. Un `YYYY-MM-DD` se guarda como mediodía UTC de ese día, para que no se corra de día al mostrarlo.
  - Atributo repetido → `ATRIBUTO_DUPLICADO`. Atributo fuera del catálogo vigente → `ATRIBUTO_NO_ENCONTRADO`.
  - Se guardan `estado: PENDIENTE`, `usuarioId = usuarioCreacionId = solicitante.id`, `archivoTipo` y `archivoNombre = nombreSeguro(...)`.
  - Si la transacción falla después de `escribir`, llamar a `borrarArchivo(id)` y relanzar el error.
- Reglas de `listar` y `obtener`:
  - Un voluntario solo ve los suyos: `listar` ignora `filtro.usuarioId` y fuerza el suyo.
  - En `obtener`, un certificado ajeno → `CERTIFICADO_NO_ENCONTRADO`.
  - Coordinación y admin ven todos y pueden filtrar.

- [ ] **Step 1: Tests que fallan.** Armar `escenarioCertificados()` con un doble de `db` que tenga:
  - `certificado`: `create`, `findMany`, `findFirst`, `update`.
  - `certificadosRelAtributos`: `updateMany`, `upsert`.
  - `certificadoAtributo.findMany`.
  - `$transaction` con rollback por `structuredClone`, como en ascensos.

  Pasar dobles de archivos que registren las escrituras y los borrados, con una opción para que fallen. Tests:
  - `test('crear deja PENDIENTE, dueño de la sesión y atributos guardados')`: aunque la entrada traiga `estado: 'APROBADO'` o `usuarioId: 'otro'`, el resultado tiene `estado === 'PENDIENTE'` y `usuarioId === solicitante.id`.
  - `test('crear exige nombre, emisor, fecha y archivo')`: un `assert.rejects` por cada código.
  - `test('crear rechaza cursoId en la parte 1')` → `/CURSO_NO_DISPONIBLE/`.
  - `test('fecha de hoy en Argentina se acepta; mañana no')`: hoy = `new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())`.
  - `test('validarDatoAtributo por tipo')`:
    - `NUMERO` con `'abc'` → rejects. `NUMERO` con `'12.5'` → `'12.5'`.
    - `BOOLEANO` con `'si'` → rejects. `BOOLEANO` con `'true'` → `'true'`.
    - `FECHA` con `'2026-13-40'` → rejects.
    - `TEXTO` con `'  '` → rejects.
  - `test('atributo inexistente o repetido')`.
  - `test('si falla la escritura del archivo no queda la fila')`: después del rechazo, `datos().certificados.length === 0`.
  - `test('voluntario no ve ajenos; coordinación sí y filtra por estado')`.
- [ ] **Step 2:** Correr `node --test tests/certificados.test.cjs`. Esperado: FAIL en los tests nuevos.
- [ ] **Step 3:** Rehacer el repositorio y el servicio según Interfaces. El repo deja de escribir `estadoId`. Borrar el controller.
- [ ] **Step 4:** Correr `node --test tests/certificados.test.cjs`. Esperado: PASS.

---

### Task 4: Servicio — edición y baja

**Files:**
- Modify: `services/certificado.service.ts`, `repositories/certificado.repository.ts`
- Test: `tests/certificados.test.cjs`

**Interfaces:**
- Produces:
  ```ts
  actualizar(id: string, entrada: CertificadoEntrada, archivo: ArchivoEntrada | null, solicitante: Solicitante): Promise<CertificadoDetalle>
  eliminar(id: string, solicitante: Solicitante): Promise<void>
  ```
- Repo:
  - `actualizar(id, cambios, atributos | undefined, usuarioId, escribir?)`: un `atributos` definido reemplaza el set con el patrón de `CursoRepository.actualizar` (`updateMany` de baja lógica + `upsert` por `certificadoId_campoId` que revive la fila).
  - `eliminar(id, usuarioId)`: baja lógica del certificado y de sus atributos.
- Reglas de `actualizar`:
  - Solo el dueño. Para cualquier otra persona, incluida coordinación → `CERTIFICADO_NO_ENCONTRADO`.
  - Solo si está `PENDIENTE` o `RECHAZADO` → si no, `NO_EDITABLE`.
  - Los campos ausentes no cambian; los presentes se validan como en `crear`. `cursoId` → `CURSO_NO_DISPONIBLE`.
  - `atributos: []` quita todos.
  - Sin campos, sin `atributos` y sin archivo → `SIN_CAMBIOS`.
  - Un archivo nuevo sobrescribe `<id>.archivo` (con temporal + rename) y actualiza `archivoTipo` y `archivoNombre`.
  - Si estaba `RECHAZADO`: `estado: PENDIENTE` y `motivoRechazo`, `fechaRevision` y `usuarioRevisionId` pasan a `null`.
- Reglas de `eliminar`: el dueño en cualquier estado, o coordinación/admin. Para cualquier otra persona → `CERTIFICADO_NO_ENCONTRADO`. El archivo no se borra.

- [ ] **Step 1: Tests que fallan:**
  - `test('editar APROBADO falla con NO_EDITABLE')`.
  - `test('editar ajeno responde no encontrado, aun siendo coordinador')`.
  - `test('editar solo el archivo de un RECHAZADO lo vuelve a PENDIENTE y limpia la revisión')`.
  - `test('editar sin nada lanza SIN_CAMBIOS')`.
  - `test('atributos reemplaza el set y [] los quita')`: después de editar con `[{A}]` y luego con `[{B}]`, los vigentes son solo B. Volver a A revive su fila (sin violar la unicidad).
  - `test('baja: dueño y coordinación sí, otro voluntario no; luego no aparece en listar')`.
- [ ] **Step 2:** Correr las pruebas. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Correr las pruebas. Esperado: PASS.

---

### Task 5: API HTTP y catálogo de atributos

**Files:**
- Create: `src/lib/certificadoErrores.ts`
- Create: `src/lib/certificados-api.ts`
- Modify (rehacer): `src/app/api/certificados/route.ts`, `src/app/api/certificados/[id]/route.ts` (que solo deleguen; `PATCH` delega en `cambiarEstado` sin cambiar su comportamiento)
- Create: `src/app/api/certificados/[id]/archivo/route.ts` (`export const runtime = 'nodejs'`)
- Modify: `src/app/api/certificados-atributos/route.ts`, `services/certificadoAtributo.service.ts`, `repositories/certificadoAtributo.repository.ts` (aceptar `tipo`)
- Test: `tests/certificados.test.cjs`

**Interfaces:**
- Consumes: `CertificadoService` (Tareas 3 y 4), `leerArchivo` (Tarea 2), `getUserFromRequest` y `esCoordinadorOAdmin`.
- Produces (`certificados-api.ts`), cada función devuelve un `NextResponse`:
  ```ts
  listarCertificados(req: NextRequest)
  crearCertificado(req: NextRequest)
  obtenerCertificado(req: NextRequest, id: string)
  actualizarCertificado(req: NextRequest, id: string)
  eliminarCertificado(req: NextRequest, id: string)
  cambiarEstadoCertificado(req: NextRequest, id: string)
  descargarArchivo(req: NextRequest, id: string)
  ```
- Produces (`certificadoErrores.ts`): `responderErrorCertificado(error: unknown, mensajeDefault: string): NextResponse`. Mapa código → `{ status, mensaje, campo? }`:

  | Código | Status | Campo |
  |---|---|---|
  | `CERTIFICADO_NO_ENCONTRADO` | 404 | — |
  | `CAMPOS_OBLIGATORIOS_FALTANTES` | 400 | — |
  | `FECHA_INVALIDA` | 400 | `fechaEmision` |
  | `ARCHIVO_REQUERIDO` | 400 | `archivo` |
  | `ARCHIVO_INVALIDO` | 400 | `archivo` |
  | `ARCHIVO_DEMASIADO_GRANDE` | 413 | `archivo` |
  | `ATRIBUTO_NO_ENCONTRADO` | 404 | `atributos` |
  | `ATRIBUTO_DUPLICADO` | 400 | `atributos` |
  | `ATRIBUTO_VALOR_INVALIDO` | 400 | `atributos` |
  | `CURSO_NO_DISPONIBLE` | 400 | — |
  | `NO_EDITABLE` | 422 | — |
  | `SIN_CAMBIOS` | 400 | — |
  | `ESTADO_INVALIDO` | 400 | — |
  | `ESTADO_NO_PENDIENTE` | 422 | — |
  | `ID_INVALIDO` | 400 | — |

  Los errores de Prisma se tratan como en `cursoErrores.ts`. Mensajes en voseo, por ejemplo "Elegí un PDF o una imagen JPG, PNG o WebP de hasta 5 MB."
- Multipart: campos de texto `nombre`, `entidadEmisora`, `fechaEmision`, `codigoVerificacion`, `cursoId`; `atributos` como JSON string de `[{campoId, dato}]`; `archivo` como `File`.
  - Si `Content-Length` supera `6 * 1024 * 1024` → 413 `ARCHIVO_DEMASIADO_GRANDE`, sin llamar a `formData()`.
  - JSON inválido en `atributos`, o que no sea un array → `ATRIBUTO_VALOR_INVALIDO`.
  - Un `File` de tamaño 0 cuenta como ausente.
- Status:
  - Sin sesión → 401.
  - `PATCH` sin rol de coordinación → 403.
  - `GET /api/certificados` acepta `?estado=` (solo valores del enum; otro valor → 400 `ESTADO_INVALIDO`) y `?usuarioId=`.
  - Alta → 201.
  - Baja → 200 `{ mensaje }`.
- Descarga: `Content-Type: archivoTipo`, `Content-Disposition: inline; filename="<ascii>"; filename*=UTF-8''<encodeURIComponent(archivoNombre)>` (el `<ascii>` reemplaza lo no ASCII por `_`), `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`. Si falta el archivo en disco → 404.
- Catálogo:
  - `GET` sin sesión → 401.
  - `POST` sin rol de coordinación → 403.
  - `POST` acepta `tipo` del enum `AtributoTipo`; otro valor → 400 `TIPO_INVALIDO`.

- [ ] **Step 1: Tests que fallan.** Cargar `certificados-api.ts` con dobles del service y de `./auth`, como `ascensos-api` en ascensos. Armar los requests con `new NextRequest(url, { method: 'POST', body: formData })`:
  - `test('sin sesión 401; alta multipart 201 con estado PENDIENTE')`.
  - `test('atributos con JSON roto responde 400 ATRIBUTO_VALOR_INVALIDO')`.
  - `test('Content-Length mayor a 6 MB responde 413 sin leer el body')`: el doble de `formData` no se llama.
  - `test('voluntario no descarga archivo ajeno (404); el dueño recibe nosniff y filename* codificado')`: con `archivoNombre = 'certificado final ñ.pdf'`, el header contiene `filename*=UTF-8''certificado%20final%20%C3%B1.pdf`.
  - `test('PATCH de voluntario responde 403')`.
  - `test('?estado=VENCIDO responde 400')`.
- [ ] **Step 2:** Correr las pruebas. Esperado: FAIL.
- [ ] **Step 3:** Implementar los módulos y las rutas. Las rutas quedan de 1 a 3 líneas por método.
- [ ] **Step 4:** Correr `node --test tests/certificados.test.cjs` y `pnpm exec tsc --noEmit`. Esperado: PASS y typecheck limpio.

---

### Task 6: Regla del caso rojo

**Files:**
- Modify: `repositories/emergencia.repository.ts:112-120`
- Test: `tests/certificados.test.cjs`

**Interfaces:** `tieneCertificadoAprobado(usuarioId: string): Promise<boolean>` (misma firma), ahora con `where: { usuarioId, estado: APROBADO, fechaEliminacion: null }`.

- [ ] **Step 1: Test que falla:** `test('caso rojo: solo cuenta APROBADO no dado de baja')`. Cargar `emergencia.repository.ts` con un doble de `db.certificado.findFirst` que aplique el `where` sobre filas en memoria. Casos:
  - PENDIENTE → `false`.
  - RECHAZADO → `false`.
  - APROBADO con `fechaEliminacion` → `false`.
  - APROBADO vigente → `true`.
- [ ] **Step 2:** Correr la prueba. Esperado: FAIL en el caso del certificado dado de baja.
- [ ] **Step 3:** Agregar el filtro.
- [ ] **Step 4:** Correr la prueba. Esperado: PASS.

---

### Task 7: Pantalla "Mis certificados" y navegación

**Files:**
- Create: `src/app/(privado)/certificados/page.tsx`, `loading.tsx`, `error.tsx` (copiar el patrón de `src/app/(privado)/casos/`)
- Create: `src/components/certificados-listado.tsx` (client)
- Modify: `src/components/navegacion.tsx` (pestaña "Formación", icono `GraduationCap`, `href: '/certificados'`, visible para todos los usuarios con sesión), `src/lib/session.ts` (sumar `'/certificados'` a `DESTINOS`)
- Modify: `src/app/globals.css` solo si hace falta alguna clase nueva, reutilizando los tokens de `DESIGN.md`.

**Interfaces:**
- Consumes: `CertificadoService.listar({}, sesion)` y `EmergenciaRepository.tieneCertificadoAprobado(sesion.id)`, ambos desde el server component. `MarcaRevision` de `marcas.tsx`.
- Produces: `CertificadosListado({ certificados: CertificadoVista[] })` con
  ```ts
  type CertificadoVista = {
    id: string; nombre: string; entidadEmisora: string; fechaEmision: string;
    codigoVerificacion: string | null; estado: CertificadoEstado; motivoRechazo: string | null;
    archivoNombre: string; atributos: { nombre: string; dato: string }[];
  }
  ```
- Contenido (spec §5.4):
  - Cabecera "Mis certificados" con el botón "Cargar certificado" → `/certificados/nuevo`.
  - Aviso con `role="status"`: "Podés tomar casos rojos." si `tieneCertificadoAprobado`; si no, "Necesitás un certificado aprobado para tomar casos rojos.".
  - Una `Card` por certificado:
    - nombre, emisor, fecha `es-AR`, número si lo hay y datos adicionales en una `<dl>`;
    - `MarcaRevision` y, si fue rechazado, "Motivo: …";
    - "Ver archivo" (`<a href="/api/certificados/:id/archivo" target="_blank" rel="noopener">`);
    - "Editar" solo si es PENDIENTE o RECHAZADO;
    - "Dar de baja" con `confirm()`, `fetch DELETE`, `router.refresh()` y un aviso de error con `role="alert"`.
  - Estado vacío: "Todavía no cargaste certificados." con el mismo botón.

- [ ] **Step 1:** Implementar.
- [ ] **Step 2:** Correr `pnpm lint` y `pnpm exec tsc --noEmit`. Esperado: limpio.
- [ ] **Step 3:** Con `pnpm dev`, usuario voluntario: entrar por la pestaña "Formación" y ver el estado vacío y el aviso de casos rojos. Probar con teclado: Tab llega a cada acción con el foco visible. Anónimo en `/certificados` → `/login?next=/certificados`, y después del login vuelve a `/certificados`.

---

### Task 8: Formulario de alta y edición

**Files:**
- Create: `src/app/(privado)/certificados/nuevo/page.tsx`, `src/app/(privado)/certificados/[id]/editar/page.tsx`
- Create: `src/components/certificado-form.tsx` (client)

**Interfaces:**
- Consumes: `CertificadoAtributoRepository.findAll()` (catálogo, desde el server), `CertificadoService.obtener(id, sesion)` (edición; si lanza `CERTIFICADO_NO_ENCONTRADO` → `notFound()`), `POST /api/certificados` y `PUT /api/certificados/:id` (Tarea 5, respuestas `{ error, codigo, campo? }`).
- Produces: `CertificadoForm({ modo: 'crear' | 'editar', catalogo: { id: string; nombre: string; tipo: AtributoTipo }[], inicial?: CertificadoVista & { atributos: { campoId: string; dato: string }[] } })`.
- Comportamiento:
  - Campos: "Nombre del certificado", "Entidad emisora", "Fecha de emisión" (`type="date"`, `max` = hoy en Argentina), "Número de certificado (opcional)" y "Archivo" (`accept="application/pdf,image/jpeg,image/png,image/webp"`; obligatorio al crear; en edición se llama "Reemplazar archivo (opcional)" y muestra el nombre actual).
  - "Datos adicionales (opcional)" solo si `catalogo.length > 0`:
    - filas con un `<select>` del atributo (sin repetir los ya elegidos) y un control según el tipo: `TEXTO` → text, `NUMERO` → number, `FECHA` → date, `BOOLEANO` → checkbox (`'true'`/`'false'`);
    - botones "Agregar dato" y "Quitar".
  - Validación del lado del cliente antes de enviar: obligatorios y tamaño ≤ 5 MB, con el mismo mensaje que la API.
  - Envío por `FormData` y `fetch`, con `AbortSignal.timeout(30000)`. En edición se manda `atributos` siempre (el set completo).
  - Si la API responde con error: el mensaje va junto al campo (`campo`) con `aria-describedby` y `aria-invalid`. Si no hay campo, va en un aviso general con `role="alert"`. Se conserva todo lo cargado.
  - Si sale bien: `router.push('/certificados')` y `router.refresh()`.
  - Si el certificado no es editable (`APROBADO`), la página de edición muestra el porqué y un enlace de vuelta, sin formulario.

- [ ] **Step 1:** Implementar.
- [ ] **Step 2:** Correr `pnpm lint` y `pnpm exec tsc --noEmit`. Esperado: limpio.
- [ ] **Step 3:** Con `pnpm dev`:
  - Cargar un certificado con un PDF → aparece PENDIENTE y "Ver archivo" lo abre.
  - Subir un `.txt` renombrado a `.pdf` → error junto al campo y los datos siguen cargados.
  - Archivo de 6 MB → error antes de enviar.
  - Editar y reemplazar solo el archivo → guarda.
  - Crear un atributo por API (`POST /api/certificados-atributos` como coordinador, `tipo: 'NUMERO'`) → aparece en "Datos adicionales" y rechaza texto.
  - Aprobar por API (`PATCH`) → "Editar" desaparece y el aviso pasa a "Podés tomar casos rojos.".
  - Tomar un caso rojo funciona. Dar de baja el certificado → vuelve a bloquearse.

---

### Task 9: Documentación y verificación final

**Files:**
- Modify: `docs/spec.md`:
  - entidades: `CertificadoEstado` sin `VENCIDO`; `Certificado` con nombre, emisor, archivo y datos adicionales EAV; quitar `UsuarioCertificado` y `SolicitudValidacionCertificado`;
  - H5;
  - regla 2: "APROBADO y no dado de baja";
  - mapa de pantallas: `/certificados`, `/certificados/nuevo` y `/certificados/[id]/editar`.
- Modify: `docs/api.md` (endpoints de la Tarea 5), `docs/ui.md` (pantallas y casos de prueba manual de las Tareas 7 y 8), `README.md:320`, `PRODUCT.md:41` (sin `VENCIDO`)
- Create: `docs/certificados.md` (formato de `docs/ascensos.md`: qué hace cada rol, reglas, API, migración, pruebas y la configuración de nginx y del volumen)

- [ ] **Step 1:** Actualizar los documentos.
- [ ] **Step 2:** Correr `node --test tests/` (todas las pruebas), `pnpm lint`, `pnpm exec tsc --noEmit` y `pnpm build`. Esperado: todo en verde.
- [ ] **Step 3:** Listarle al usuario los archivos tocados y los pasos manuales del deploy: copiar la configuración de nginx al VPS y recargarlo, y crear el volumen `mdw_uploads` al levantar el compose. No commitear.
