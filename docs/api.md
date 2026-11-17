# Endpoints de la API

| Método y ruta | Qué hace | Rol | Historia |
| :--- | :--- | :--- | :--- |
| `POST /api/usuarios` | Registrar una nueva cuenta de usuario | **Público** | H1 |
| `GET /api/usuarios` | Listar y consultar usuarios registrados | Coordinador | H1 |
| `GET /api/usuarios/me` | Obtener el perfil del usuario autenticado | Autenticado | H1 |
| `PATCH /api/usuarios/me` | Actualizar datos personales o perfil | Autenticado | H1 |
| `POST /api/auth/login` | Iniciar sesión y obtener token/sesión | **Público** | H2 |
| `POST /api/auth/logout` | Cerrar la sesión activa | Autenticado | H2 |
| `POST /api/solicitudes-ascenso` | Crear una solicitud para ascender a coordinador | Voluntario | H3 |
| `GET /api/solicitudes-ascenso` | Listar solicitudes propias; coordinación puede listar todas o filtrar con `?usuarioId=...` | Autenticado | H3 |
| `POST /api/solicitudes-ascenso/:id/aprobar` | Aprueba la solicitud de ascenso de la persona | Coordinador | H3 |
| `POST /api/solicitudes-ascenso/:id/rechazar` | Desaprueba la solicitud de ascenso de la persona | Coordinador | H3 |
| `GET /api/cursos` | Consultar el catálogo de cursos | Autenticado | H4 |
| `POST /api/cursos` | Crear un nuevo curso en el catálogo | Coordinador | H4 |
| `PATCH /api/cursos/:id` | Editar información o atributos de un curso | Coordinador | H4 |
| `DELETE /api/cursos/:id` | Desactivar o eliminar un curso del catálogo | Coordinador | H4 |
| `GET /api/certificados` | Listar los certificados propios; coordinación ve todos y filtra con `?estado=` y `?usuarioId=` | Autenticado | H5 |
| `POST /api/certificados` | Cargar un certificado propio sin curso (`multipart/form-data`: `nombre`, `entidadEmisora`, `fechaEmision`, `codigoVerificacion` opcional, `archivo` PDF/imagen hasta 5 MB y datos adicionales); propietario y estado `PENDIENTE` salen del servidor | Autenticado | H5 |
| `GET /api/certificados/:id` | Detalle de un certificado; solo dueño o coordinación (terceros reciben 404) | Autenticado | H5 |
| `PUT /api/certificados/:id` | El dueño edita un certificado `PENDIENTE` o `RECHAZADO` (un rechazado vuelve a `PENDIENTE`) | Autenticado | H5 |
| `DELETE /api/certificados/:id` | Baja lógica; solo dueño o coordinación | Autenticado | H5 |
| `GET /api/certificados/:id/archivo` | Ver o descargar el archivo; solo dueño o coordinación (terceros reciben 404) | Autenticado | H5 |
| `GET /api/certificados-atributos` | Catálogo de datos adicionales de certificados | Autenticado | H5 |
| `POST /api/certificados-atributos` | Crear un dato adicional (`nombre`, `tipo`) | Coordinador | H5 |
| `PATCH /api/certificados/:id` | Aprobar o rechazar un certificado pendiente con `estado` y `motivo` (obligatorio al rechazar); decisión repetida devuelve 409. Usado por `/certificados/revisar` | Coordinador | H6 |
| `GET /api/solicitudes-certificados` | Obtener la tabla de solicitudes de validación de certificados | Coordinador | H6 |
| `PATCH /api/solicitudes-certificados/:id` | Igual que `PATCH /api/certificados/:id`: resolver con `estado` APROBADO o RECHAZADO; rechazo exige `motivo`; decisión repetida devuelve 409 | Coordinador | H6 |
| `POST /api/emergencias` | Reportar una nueva emergencia en la vía pública | **Público** | H7 |
| `GET /api/emergencias` | Listar y filtrar emergencias activas para el mapa | Autenticado | H8 |
| `GET /api/emergencias/:id` | Obtener detalle y ficha completa de una emergencia | Autenticado | H8 |
| `POST /api/emergencias/:id/tomar` | Asignarse y marcar la emergencia como `EN CAMINO` | Voluntario | H10 |
| `POST /api/emergencias/:id/finalizar` | Guardar `observaciones` (10 a 10000 caracteres) y marcar como GESTIONADA; PUT permanece por compatibilidad | Voluntario (asignado) | H11 |
| `GET /api/notificaciones` | Avisos del usuario (historia 12) con `noLeidas`; `?resumen=1` devuelve solo el contador. Si consulta coordinación, revisa los casos sin atender (una vez por minuto como máximo) | Autenticado | H12 |

`GET /api/certificados/:id/archivo` descarga el comprobante con sesión. Solo su propietario y coordinación pueden leerlo; terceros reciben 404. Las pruebas funcionales verifican este acceso además de la matriz de roles.

La solicitud de validación utiliza el propio registro Certificado: nace PENDIENTE y conserva el resultado y motivo de rechazo. No hay una segunda tabla de solicitudes. Al resolver se guardan quién revisó y cuándo (`usuarioRevisionId`, `fechaRevision`) y una notificación al propietario dentro de la misma transacción. El detalle del módulo está en `docs/certificados.md`.
