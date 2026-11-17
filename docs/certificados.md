# Certificados (parte 1)

La historia 5 de `docs/spec.md` pide que cada persona cargue y administre sus certificados de capacitación. Esta primera parte cubre los certificados **sin curso**. La vinculación con cursos (parte 2) y la cola de revisión de coordinación (parte 3) vienen después. Diseño completo: `docs/superpowers/specs/2026-11-16-cursos-certificados-design.md`.

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
- **Revisión:** hasta la parte 3, coordinación aprueba o rechaza con `PATCH /api/certificados/:id` y `{ "estado": "APROBADO" | "RECHAZADO" }`.
- **Catálogo de datos adicionales:** coordinación lo administra por API (`POST /api/certificados-atributos` con `nombre` y `tipo`). Si está vacío, el formulario no muestra la sección.

API: ver la tabla de `docs/api.md` y los ejemplos de `README.md`.
- Las cargas usan `multipart/form-data`; `atributos` va como JSON.
- Los errores responden `{ error, codigo, campo? }`. `campo` indica en qué parte del formulario mostrarlos.
- La carga es atómica: si falla la escritura del archivo, no queda la fila.

## Archivos y despliegue

- **Carpeta:** los archivos se guardan en `CERTIFICADO_UPLOAD_DIR` (default `<proyecto>/.data/certificados`) como `<id>.archivo`. El tipo se valida y se sirve según el contenido real, no la extensión.
- **Volumen:** en producción el compose monta el volumen `mdw_uploads` en `/app/.data`, para que los archivos sobrevivan a los redeploys. También cubre las fotos de emergencias, que hasta ahora se perdían.
- **nginx:** `infra/nginx/mdw.conf` suma `client_max_body_size 6m;`; el default de 1 MB rechazaba los archivos. Hay que copiarlo a mano al VPS y recargar nginx (ver el comentario del archivo).

## Migración

`20261116120000_certificados_parte1`:
- suma nombre, entidad emisora, archivo, `fechaActualizacion` y los campos de revisión de la parte 3;
- pasa `codigoVerificacion` a opcional y no único;
- quita `VENCIDO`.

**Requiere la tabla `certificado` vacía.** Las columnas nuevas son obligatorias y no tienen valor por defecto. Según el `sql_mode`, MySQL podría completar las filas existentes con texto vacío en lugar de fallar. Antes de desplegar, correr `SELECT COUNT(*) FROM certificado;` en producción y confirmar que da 0.

## Pruebas

`node --test tests/certificados.test.cjs` cubre archivos, alta, validaciones, datos adicionales, edición, baja, privacidad, API HTTP y la regla del caso rojo. Usa dobles de base de datos, como `tests/ascensos.test.cjs`. La verificación manual está en `docs/ui.md` (pasos 12 a 15).
