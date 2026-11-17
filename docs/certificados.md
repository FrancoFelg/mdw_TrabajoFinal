# Certificados (parte 1)

La historia 5 de `docs/spec.md` pide que cada persona cargue y administre sus certificados de capacitación. Esta primera parte cubre los certificados **sin curso**. La revisión de coordinación (historia 6) ya está integrada desde `main`; la vinculación con cursos (parte 2) viene después. Diseño completo: `docs/superpowers/specs/2026-11-16-cursos-certificados-design.md`.

- **Cualquier usuario con sesión:** abrir «Formación» en la navegación (`/certificados`). «Cargar certificado» pide:
  - nombre, entidad emisora y fecha de emisión (no posterior a hoy);
  - número (opcional);
  - el archivo: PDF, JPG, PNG o WebP de hasta 5 MB;
  - datos adicionales del catálogo, opcionales. Cada valor se valida según su tipo: texto, número, fecha o sí/no.
- **Estados:**
  - Todo certificado nace `PENDIENTE` y no habilita casos rojos hasta quedar `APROBADO`.
  - Se edita solo mientras está `PENDIENTE` o `RECHAZADO`. Editar uno rechazado lo vuelve a `PENDIENTE` y borra el motivo.
  - Uno `APROBADO` no se edita: se da de baja y se carga otro.
- **Baja:** el dueño o coordinación. Es lógica: el certificado y sus datos adicionales quedan con `fechaEliminacion` y el archivo se conserva.
- **Caso rojo:** solo habilita un certificado `APROBADO` y no dado de baja (regla 2). La pantalla avisa si la persona puede o no tomar casos rojos.
- **Privacidad:** cada persona ve, edita y descarga solo sus certificados. Coordinación puede verlos y descargarlos todos. Un certificado ajeno responde `404`.
- **Revisión:** coordinación abre `/certificados/revisar` (pendientes e historial) y aprueba o rechaza. Por API: `PATCH /api/certificados/:id` o `PATCH /api/solicitudes-certificados/:id` con `{ "estado": "APROBADO" | "RECHAZADO", "motivo" }`. El motivo es obligatorio al rechazar (hasta 2000 caracteres). Una decisión repetida responde `409`. Se guardan quién revisó y cuándo, y la persona recibe un aviso; coordinación recibe uno por cada carga nueva.
- **`/formacion`:** la ruta anterior redirige: coordinación a `/certificados/revisar`, el resto a `/certificados`.
- **Catálogo de datos adicionales:** coordinación lo administra por API (`POST /api/certificados-atributos` con `nombre` y `tipo`). Si está vacío, el formulario no muestra la sección.

API: ver la tabla de `docs/api.md` y los ejemplos de `README.md`.
- Las cargas usan `multipart/form-data`; `atributos` va como JSON.
- Los errores responden `{ error, codigo, campo? }`. `campo` indica en qué parte del formulario mostrarlos.
- La carga es atómica: si falla la escritura del archivo, no queda la fila.

## Archivos y despliegue

- **Carpeta:** los archivos se guardan en `CERTIFICATE_UPLOAD_DIR` (default `<proyecto>/.data/certificados`) como `<id>.documento`, la misma convención que los comprobantes cargados antes con `/formacion`, que siguen sirviéndose. El tipo se valida y se sirve según el contenido real, no la extensión.
- **Volumen:** en producción el compose monta el volumen `mdw_uploads` en `/app/.data`, para que los archivos sobrevivan a los redeploys. También cubre las fotos de emergencias, que hasta ahora se perdían.
- **nginx:** `infra/nginx/mdw.conf` suma `client_max_body_size 6m;`; el default de 1 MB rechazaba los archivos. Hay que copiarlo a mano al VPS y recargar nginx (ver el comentario del archivo).

## Migración

`20261116130000_certificados_parte1` corre después de `20261116060000_informes_y_archivos_certificados` (columnas `archivo` y `motivoRechazo` de `main`):
- suma nombre, entidad emisora, tipo y nombre del archivo, `fechaActualizacion`, `fechaRevision` y `usuarioRevisionId`;
- quita la columna `archivo` (la ruta sale del id);
- pasa `codigoVerificacion` a opcional y no único;
- quita `VENCIDO` (los vencidos pasan a `RECHAZADO`).

**Conserva los certificados existentes.** Las columnas nuevas se crean con valores provisorios (`nombre` toma el código de verificación; entidad «Sin especificar»; fecha de emisión = fecha de alta) y después se les quita el default. Conviene revisar esos certificados en producción después del despliegue.

## Pruebas

`node --test tests/certificados.test.cjs` cubre archivos, alta, validaciones, datos adicionales, edición, baja, privacidad, API HTTP, revisión (motivo, revisor, aviso, carrera) y la regla del caso rojo. `tests/e2e/certificados.spec.ts` recorre carga, rechazo, nueva carga, aprobación y permisos contra la app real. Usa dobles de base de datos, como `tests/ascensos.test.cjs`. La verificación manual está en `docs/ui.md` (pasos 12 a 15).
