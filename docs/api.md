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
| `GET /api/solicitudes-ascenso` | Listar las solicitudes de ascenso pendientes y resueltas | Coordinador | H3 |
| `POST /api/solicitudes-ascenso/:id/aprobar` | Aprueba la solicitud de ascenso de la persona | Coordinador | H3 |
| `POST /api/solicitudes-ascenso/:id/rechazar` | Desaprueba la solicitud de ascenso de la persona | Coordinador | H3 |
| `GET /api/cursos` | Consultar el catálogo de cursos | Autenticado | H4 |
| `POST /api/cursos` | Crear un nuevo curso en el catálogo | Coordinador | H4 |
| `PATCH /api/cursos/:id` | Editar información o atributos de un curso | Coordinador | H4 |
| `DELETE /api/cursos/:id` | Desactivar o eliminar un curso del catálogo | Coordinador | H4 |
| `GET /api/certificados` | Listar los certificados subidos por el usuario activo | Autenticado | H5 |
| `POST /api/certificados` | Cargar un nuevo certificado (asociando curso de forma opcional) | Autenticado | H5 |
| `GET /api/solicitudes-certificados` | Obtener la tabla de solicitudes de validación de certificados | Coordinador | H6 |
| `PATCH /api/solicitudes-certificados/:id` | Aprobar o rechazar la validación de un certificado | Coordinador | H6 |
| `POST /api/emergencias` | Reportar una nueva emergencia en la vía pública | **Público** | H7 |
| `GET /api/emergencias` | Listar y filtrar emergencias activas para el mapa | Autenticado | H8 |
| `GET /api/emergencias/:id` | Obtener detalle y ficha completa de una emergencia | Autenticado | H8 |
| `GET /api/notificaciones` | Consultar alertas generadas por el sistema | Autenticado | H9 |
| `PATCH /api/notificaciones/preferencias` | Configurar el envío opcional de notificaciones por email | Autenticado | H9 |
| `POST /api/emergencias/:id/tomar` | Asignarse y marcar la emergencia como `EN CAMINO` | Voluntario | H10 |
| `POST /api/emergencias/:id/finalizar` | Registrar informe de atención y marcar como `GESTIONADA` | Voluntario (asignado) | H11 |