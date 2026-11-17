# Diseño — Módulo de cursos y certificados

Fecha: 2026-11-16 · Rama de la parte 1: `feat/fgr/CRUD-Certificados`
Historias: H4 (cursos), H5 (certificados), H6 (validar), regla de negocio 2 (caso rojo).

## 1. Intención

El enunciado del trabajo final pide un módulo para validar los conocimientos de un voluntario:

- El **coordinador** hace el CRUD de **cursos**. A un curso le puede indicar qué certificado otorga (por ejemplo, "Curso de Primeros Auxilios – Cruz Roja" otorga el "Certificado de Primeros Auxilios – Cruz Roja"). Ese certificado no pertenece a ninguna persona.
- El **voluntario** hace el CRUD de **sus certificados**. Puede vincular uno a un curso: los datos ya se conocen y solo sube el archivo. Si no lo vincula, carga todo el detalle a mano.
- En los dos casos el certificado nace **PENDIENTE**. Un coordinador lo **aprueba** o lo **rechaza**. Solo un certificado aprobado está vigente y permite tomar emergencias **ROJO**.

Hoy existen el modelo (con tablas EAV para cursos y certificados) y la API, pero ninguna pantalla.

## 2. Entrega por partes

El trabajo se divide en tres partes. Cada una va en su propia rama, con su propio plan, y se integra antes de empezar la siguiente.

| Parte | Alcance | Detalle |
|---|---|---|
| **1. Certificados** | CRUD de certificados propios **sin curso**, con archivo y datos adicionales (EAV). Arreglos de bugs existentes | §5 |
| **2. Cursos** | Pantallas de cursos, horas y "certificado que otorga". Camino "subir certificado de un curso" | §6 |
| **3. Aprobación** | Cola de revisión, aprobar o rechazar con motivo, avisos | §7 |

Consecuencia aceptada: entre la parte 1 y la 3, los certificados quedan PENDIENTE y solo se pueden aprobar desde la API (`PATCH /api/certificados/:id`, que ya existe).

## 3. Decisiones globales

- **Enfoque elegido para el "certificado que otorga" un curso: va dentro del curso** (no hay entidad `TipoCertificado`). Se descartaron un catálogo `TipoCertificado` (más piezas; decisión del equipo) y guardar todo en EAV.
- **Uso del EAV: mixto.** Los datos que identifican un certificado (nombre, entidad emisora, fecha de emisión, archivo) van en **columnas** de `Certificado`. El **EAV** (`CertificadoAtributo` / `CertificadosRelAtributos`) guarda **datos adicionales opcionales** elegidos de un catálogo (por ejemplo, horas, nivel, matrícula). Se descartaron "todo en EAV" (validar obligatorios exigiría marcar atributos como requeridos, listados más complejos) y "EAV sin uso".
- **Sin vencimiento:** se elimina `VENCIDO` del enum `CertificadoEstado`. Vigente = `APROBADO` y no dado de baja.

**No objetivos (todas las partes):** firma digital o verificación automática (spec §9); vencimiento.

**Anti-objetivos:**
- Que un certificado sin aprobar, rechazado o dado de baja habilite un caso rojo.
- Que un voluntario vea, edite o descargue certificados ajenos.
- Que un coordinador apruebe su propio certificado (parte 3).
- Que editar un curso cambie certificados ya emitidos (parte 2).

## 4. Restricciones

- Next 16.3 (App Router). Antes de escribir código, leer las guías en `node_modules/next/dist/docs/` (`AGENTS.md`).
- Prisma 5 + MySQL. El job "Migraciones vs schema" del CI exige que el schema y las migraciones coincidan. Una migración por parte.
- Arquitectura: `route.ts` → `controllers/` → `services/` → `repositories/`. Los errores de negocio se lanzan como `new Error('CODIGO')` y se traducen a HTTP en un mapa como el de `src/lib/cursoErrores.ts`.
- Autorización con `getUserFromRequest` / `esCoordinadorOAdmin` (`src/lib/auth.ts`). El dueño **siempre** sale del token, nunca del body.
- Archivos: patrón de `src/lib/fotos-emergencia.ts` (disco, validación por *magic bytes*, temporal + rename).
- EAV: reemplazo de valores con el patrón de `CursoRepository.actualizar`. Se hace baja lógica de las filas vigentes y `upsert` por la clave única `(certificadoId, campoId)`, que revive la fila existente.
- Accesibilidad de la spec §7: labels explícitos, teclado, foco visible y estado con texto además de color.
- Pruebas con `node:test` y dobles, como `tests/ascensos.test.cjs`.

---

## 5. Parte 1 — Certificados

### 5.1 Modelo (migración `certificados_parte1`)

**`Certificado`**, además de los campos de auditoría que ya tiene:

| Campo | Cambio |
|---|---|
| `cursoId String?` | Sin cambio. En la parte 1 la API lo rechaza si viene (ver 5.2) |
| `nombre String` | **Nuevo** |
| `entidadEmisora String` | **Nuevo** |
| `fechaEmision DateTime` | Deja de tener `@default(now())` |
| `codigoVerificacion String?` | Pasa a **opcional y sin `@unique`**. En la UI: "Número de certificado (opcional)" |
| `archivoTipo String` | **Nuevo**. MIME detectado: `application/pdf`, `image/jpeg`, `image/png`, `image/webp` |
| `archivoNombre String` | **Nuevo**. Nombre original, saneado, para mostrar y descargar |
| `fechaActualizacion DateTime @updatedAt` | **Nuevo** (lo usa la parte 3 para las claves de aviso) |
| `motivoRechazo String? @db.Text`, `fechaRevision DateTime?`, `usuarioRevisionId String?` → `Usuario` (`"CertificadoRevisor"`) | **Nuevos**. Se crean ahora para tener una sola migración de modelo; los usa la parte 3 |

- Enum `CertificadoEstado`: `PENDIENTE | APROBADO | RECHAZADO`.
- La migración asume que la tabla `certificado` no tiene filas en producción (igual que la del 2026-09-22). **Verificarlo antes de aplicarla.**
- `CertificadoAtributo` y `CertificadosRelAtributos` no cambian.

Archivo en disco: `CERTIFICADO_UPLOAD_DIR` (default `.data/certificados`), nombre `<certificadoId>.archivo`. Sumar la variable a `.env.example` y verificar que `.data/` esté en `.gitignore` y montado en el volumen de `infra/docker` (como las fotos).

### 5.2 Reglas

- Cualquier usuario con sesión (incluida coordinación) gestiona **sus** certificados.
- **Crear:** obligatorios `nombre`, `entidadEmisora`, `fechaEmision` (no futura) y `archivo`. `codigoVerificacion` y `atributos` son opcionales. Si llega `cursoId` → 400 `CURSO_NO_DISPONIBLE` (se habilita en la parte 2). Estado inicial siempre PENDIENTE: el cliente no puede elegirlo.
- **Archivo:** PDF, JPG, PNG o WebP, hasta **5 MB**, validado por contenido. PDF = empieza con `%PDF-`.
- **Atributos (EAV):** lista de `{ campoId, dato }`. Cada `campoId` debe existir en el catálogo vigente y no puede repetirse. El `dato` se valida según el `tipo` del atributo:
  - `TEXTO`: no vacío.
  - `NUMERO`: número finito.
  - `FECHA`: fecha válida.
  - `BOOLEANO`: `"true"` o `"false"`.

  Se guarda como texto en `dato`.
- **Editar:** solo el dueño, solo si está PENDIENTE o RECHAZADO (si no, 422 `NO_EDITABLE`). Todos los campos son opcionales. El archivo se reemplaza si viene. Si viene `atributos`, reemplaza el set completo (lista vacía = quitar todos). Si estaba RECHAZADO, vuelve a PENDIENTE y se limpian `motivoRechazo`, `fechaRevision` y `usuarioRevisionId`.
- **Baja:** el dueño en cualquier estado, y coordinación (como hoy). Es baja lógica del certificado y de sus valores EAV. El archivo se conserva.
- **Ver, listar y descargar:** el dueño, y coordinación. Para otra persona, 404.
- **Caso rojo:** `EmergenciaRepository.tieneCertificadoAprobado` suma `fechaEliminacion: null`. `NotificacionRepository.habilitados()` ya lo filtra.
- **Catálogo de atributos** (`/api/certificados-atributos`): GET pasa a exigir sesión y POST pasa a ser solo de coordinación/admin. El POST además acepta `tipo` (hoy lo ignora). No tiene pantalla de gestión en este módulo: coordinación lo administra por API.

### 5.3 API

| Método y ruta | Quién | Qué |
|---|---|---|
| `GET /api/certificados` | Con sesión | Voluntario: los suyos. Coordinación: todos, con filtros `?estado=` y `?usuarioId=`. Ordenados por creación, los más nuevos primero. Incluyen los atributos vigentes con nombre y tipo del campo |
| `POST /api/certificados` | Con sesión | `multipart/form-data`: `nombre`, `entidadEmisora`, `fechaEmision`, `codigoVerificacion?`, `atributos?` (JSON string), `archivo` |
| `GET /api/certificados/:id` | Dueño o coord. | Detalle |
| `PUT /api/certificados/:id` | **Dueño** (hoy es de coordinación) | `multipart/form-data`, todo opcional |
| `PATCH /api/certificados/:id` | Coord./admin | Sin cambios en la parte 1 (se rehace en la parte 3) |
| `DELETE /api/certificados/:id` | Dueño o coord. | Baja lógica |
| `GET /api/certificados/:id/archivo` | Dueño o coord. | Bytes con su `Content-Type`, `Content-Disposition: inline; filename="…"`, `X-Content-Type-Options: nosniff` y `Cache-Control: private, no-store` |

- **Atomicidad del alta:** la fila (con sus atributos) se crea dentro de `db.$transaction` y el archivo se escribe antes de confirmarla. Si la escritura falla, la transacción se revierte. Si falla la confirmación después de escribir, se borra el archivo. Es una desviación consciente de la spec §8: un certificado sin archivo no se puede revisar. El formulario conserva lo cargado para reintentar.
- **Errores** (en un `src/lib/certificadoErrores.ts` gemelo de `cursoErrores.ts`):

  | Código | HTTP |
  |---|---|
  | `CERTIFICADO_NO_ENCONTRADO` | 404 |
  | `CAMPOS_OBLIGATORIOS_FALTANTES` | 400 |
  | `FECHA_INVALIDA` (incluye fecha futura) | 400 |
  | `ARCHIVO_REQUERIDO` | 400 |
  | `ARCHIVO_INVALIDO` | 400 |
  | `ARCHIVO_DEMASIADO_GRANDE` | 413 |
  | `ATRIBUTO_NO_ENCONTRADO` | 404 |
  | `ATRIBUTO_DUPLICADO` | 400 |
  | `ATRIBUTO_VALOR_INVALIDO` | 400 |
  | `CURSO_NO_DISPONIBLE` | 400 |
  | `NO_EDITABLE` | 422 |
  | `SIN_CAMBIOS` | 400 |

- Arreglar `certificado.repository.ts`, que todavía escribe `estadoId` (columna eliminada).

### 5.4 Pantallas

Pestaña **"Formación"** en `src/components/navegacion.tsx` (el comentario del archivo la prevé) → `/certificados`.

| Ruta | Acceso | Contenido |
|---|---|---|
| `/certificados` | Con sesión | "Mis certificados". Un aviso arriba dice "Podés tomar casos rojos" o "Necesitás un certificado aprobado para tomar casos rojos". Debajo, una tarjeta por certificado con nombre, emisor, fecha de emisión, número, datos adicionales y estado con texto e icono (Pendiente / Aprobado / Rechazado + motivo si lo hay). Acciones: "Ver archivo", "Editar" (si es editable) y "Dar de baja" (con confirmación). Botón "Cargar certificado". Estado vacío con llamada a la acción |
| `/certificados/nuevo` | Con sesión | Formulario con nombre, entidad emisora, fecha de emisión, número (opcional) y archivo. Sección "Datos adicionales (opcional)": agregar filas eligiendo un atributo del catálogo y cargando su valor, con un control según el tipo (texto, número, fecha o casilla). Si el catálogo está vacío, la sección no se muestra. Los errores se muestran por campo, sin perder lo cargado |
| `/certificados/[id]/editar` | Dueño | Mismo formulario precargado. Archivo opcional ("Reemplazar archivo"). Si no es editable, explica por qué y vuelve al listado |

Seguir `DESIGN.md`, `src/components/ui` y el estilo de `ascensos`/`usuarios` (server component para leer, y server actions o fetch a la API para escribir; queda a criterio). Estados de cargando y error como el resto de las pantallas privadas.

### 5.5 Pruebas (`tests/certificados.test.cjs`)

- Alta válida: queda PENDIENTE, el dueño sale del token, guarda los atributos.
- Faltan campos obligatorios; fecha futura; llega `cursoId` → 400.
- Archivo faltante, de tipo inválido (por contenido) o mayor a 5 MB.
- Atributo inexistente, repetido o con valor inválido según su tipo.
- Un voluntario no ve, no edita, no descarga ni da de baja certificados ajenos (404).
- Editar APROBADO → 422. Editar RECHAZADO → vuelve a PENDIENTE y limpia la revisión. Reemplazo del set de atributos.
- Caso rojo: PENDIENTE, RECHAZADO o dado de baja no habilitan; APROBADO sí.
- Si falla la escritura del archivo, no queda la fila.

Además: `pnpm lint`, typecheck, `next build` y el job de migraciones del CI.

### 5.6 Documentación

- `docs/spec.md`:
  - Entidades: Certificado sin VENCIDO y con datos adicionales EAV. Quitar `UsuarioCertificado` y `SolicitudValidacionCertificado`, que nunca se implementaron.
  - H5.
  - Regla 2 ("APROBADO y no dado de baja").
  - Mapa de pantallas.
- `docs/api.md` y `docs/ui.md`: endpoints y pantallas de la parte 1.
- `docs/certificados.md` breve, como `docs/ascensos.md`.

---

## 6. Parte 2 — Cursos (resumen; se detalla al empezarla)

- `Cursos` suma `horas Int?`, `certificadoNombre String?` y `certificadoEmisor String?`. Un curso **otorga certificado** si tiene nombre y emisor (los dos o ninguno). Por qué columnas y no EAV: es la identidad del certificado, no un dato extra (misma lógica de la opción A).
- Pantallas `/cursos`, `/cursos/nuevo` y `/cursos/[id]/editar` (coordinación edita; todos ven el catálogo). Los atributos EAV del curso se muestran y editan como "Datos adicionales", igual que en certificados.
- Camino "con curso" en `/certificados/nuevo` (y `?cursoId=`):
  - El curso debe existir, no estar dado de baja y otorgar certificado.
  - `nombre` y `entidadEmisora` se **copian** del curso. `fechaEmision` = `fechaHasta` del curso.
  - El usuario solo sube el archivo (y el número, opcional).
  - Sin duplicados: no puede tener dos certificados del mismo curso que estén PENDIENTE o APROBADO (409). Tras un rechazo, sí puede volver a cargar.
- La baja de un curso no altera los certificados ya cargados.

## 7. Parte 3 — Aprobación (resumen; se detalla al empezarla)

- `/certificados/revisar` (coordinación): cola de pendientes, la más antigua primero, con persona, datos, archivo, "Aprobar" y "Rechazar" (con motivo obligatorio). Pestaña de historial.
- `PATCH /api/certificados/:id`: solo PENDIENTE (422), nunca el propio (403), y rechazar exige motivo. Guarda `fechaRevision`, `usuarioRevisionId` y `motivoRechazo`.
- Avisos:
  - **Carga o reenvío** → `validacionPendiente('certificado', …)`. Corregir el enlace, que hoy apunta a `/equipo` (no existe), para que lleve a `/certificados/revisar`. La clave debe incluir `fechaActualizacion`: hoy se deduplica por `(usuarioId, clave)` y el reenvío no avisaría.
  - **Resultado** → aviso al dueño dentro de la transacción, con el patrón de `solicitudAscenso.repository.ts` (tipo `VALIDACION_PENDIENTE`, sin tipo nuevo). Clave: `certificado_resultado:<id>:<fechaRevision>`.
