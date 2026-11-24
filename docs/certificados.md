# Certificados y cursos

La historia 5 de `docs/spec.md` pide que cada persona cargue y administre sus certificados de capacitación. La historia 4 pide el catálogo de cursos. Cubre certificados con y sin curso, el catálogo y la revisión de coordinación (historia 6). Diseño completo: `docs/superpowers/specs/2026-11-16-cursos-certificados-design.md`.

- **Cualquier usuario con sesión:** abrir «Formación» en la navegación (`/certificados`). «Cargar certificado» pide:
  - nombre, entidad emisora y fecha de emisión (no posterior a hoy);
  - número (opcional);
  - el archivo: PDF, JPG, PNG o WebP de hasta 5 MB;
  - datos adicionales del catálogo, opcionales. Cada valor se valida según su tipo: texto, número, fecha o sí/no.
- **Cursos** (`/cursos`, pestaña de «Formación»):
  - Todos ven el catálogo. Coordinación crea, edita y da de baja cursos: título, descripción, fechas, horas (opcional), certificado que otorga (nombre y entidad, los dos o ninguno) y datos adicionales.
  - Si un curso otorga certificado y ya terminó, «Cargar mi certificado» abre `/certificados/nuevo?cursoId=…`. La persona solo sube el archivo y, si quiere, el número. Nombre y entidad se **copian** del curso y la fecha de emisión es su fin, así que editar o dar de baja el curso no cambia certificados ya cargados.
  - Una persona no puede tener dos certificados pendientes o aprobados del mismo curso (`409`). Después de un rechazo o una baja puede volver a cargar. La regla se aplica con un bloqueo de la fila del curso, así dos cargas simultáneas no pasan las dos.
  - Un certificado de curso no cambia de curso ni de datos copiados al editarlo: se cambian archivo, número y datos adicionales.
- **Estados:**
  - Todo certificado nace `PENDIENTE` y no habilita casos rojos hasta quedar `APROBADO`.
  - Se edita solo mientras está `PENDIENTE` o `RECHAZADO`. Editar uno rechazado lo vuelve a `PENDIENTE` y borra el motivo.
  - Uno `APROBADO` no se edita: se da de baja y se carga otro.
- **Baja:** el dueño o coordinación. Es lógica: el certificado y sus datos adicionales quedan con `fechaEliminacion` y el archivo se conserva.
- **Caso rojo:** solo habilita un certificado `APROBADO` y no dado de baja (regla 2). La pantalla avisa si la persona puede o no tomar casos rojos.
- **Privacidad:** cada persona ve, edita y descarga solo sus certificados. Coordinación puede verlos y descargarlos todos. Un certificado ajeno responde `404`.
- **Revisión:** coordinación abre `/certificados/revisar` (pendientes e historial) y elige «Aprobar» o «Rechazar»; ninguna opción viene elegida de antemano y la decisión se confirma en un segundo paso («Confirmar aprobación» avisa que la persona podrá tomar casos rojos; «Confirmar rechazo» pide el motivo). Por API: `PATCH /api/certificados/:id` o `PATCH /api/solicitudes-certificados/:id` con `{ "estado": "APROBADO" | "RECHAZADO", "motivo" }`. El motivo es obligatorio al rechazar (hasta 2000 caracteres). Una decisión repetida responde `409`. Nadie revisa su propio certificado (`403` `CERTIFICADO_PROPIO`; en pantalla aparece sin formulario). Se guardan quién revisó y cuándo, y la persona recibe un aviso por cada revisión. Coordinación recibe uno por cada carga nueva y otro cuando la persona corrige un certificado rechazado, que vuelve a revisión y se puede revisar otra vez.
- **`/formacion`:** la ruta anterior redirige: coordinación a `/certificados/revisar`, el resto a `/certificados`.
- **Catálogo de datos adicionales:** coordinación lo administra por API (`POST /api/certificados-atributos` con `nombre` y `tipo`). Si está vacío, el formulario no muestra la sección.

Pantallas: los formularios usan Server Actions (`src/app/actions/formacion.ts`) con el componente `Formulario`, como el resto de la app: errores debajo de cada campo, errores de negocio arriba, datos y archivo conservados ante un error. Las acciones llaman a los mismos servicios que la API.

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

`20261117120000_cursos_parte2` suma a `Cursos` tres columnas opcionales: `horas`, `certificadoNombre` y `certificadoEmisor`. No toca datos existentes.

## Pruebas

`node --test tests/certificados.test.cjs` cubre archivos, alta, validaciones, datos adicionales, edición, baja, privacidad, API HTTP, revisión (motivo, revisor, aviso, carrera) y la regla del caso rojo. `tests/cursos.test.cjs` cubre horas, certificado que otorga y rol vigente en las rutas de cursos. `tests/e2e/certificados.spec.ts` recorre carga, rechazo, nueva carga, aprobación, permisos y el camino completo de un curso (crear en pantalla, cargar solo el archivo, duplicado, curso sin terminar y baja) contra la app real. Usa dobles de base de datos, como `tests/ascensos.test.cjs`. La verificación manual está en `docs/ui.md` (pasos 12 a 15).
