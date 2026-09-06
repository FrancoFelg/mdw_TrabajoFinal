# Endpoints de la API

| Método y ruta | Qué hace | Rol | Historia |
| :--- | :--- | :--- | :--- |
| `POST /api/usuarios` | Registrar una nueva cuenta de usuario[cite: 5] | **Público** | H1[cite: 5] |
| `GET /api/usuarios` | Listar y consultar usuarios registrados[cite: 5] | Coordinador | H1[cite: 5] |
| `GET /api/usuarios/me` | Obtener el perfil del usuario autenticado[cite: 5] | Autenticado | H1[cite: 5] |
| `PATCH /api/usuarios/me` | Actualizar datos personales o perfil[cite: 5] | Autenticado | H1[cite: 5] |
| `POST /api/auth/login` | Iniciar sesión y obtener token/sesión[cite: 5] | **Público** | H2[cite: 5] |
| `POST /api/auth/logout` | Cerrar la sesión activa | Autenticado | H2[cite: 5] |
| `POST /api/solicitudes-ascenso` | Crear una solicitud para ascender a coordinador[cite: 5] | Voluntario | H3[cite: 5] |
| `GET /api/solicitudes-ascenso` | Listar las solicitudes de ascenso pendientes y resueltas[cite: 5] | Coordinador | H3[cite: 5] |
| `PATCH /api/solicitudes-ascenso/:id` | Aprobar o rechazar la solicitud de ascenso[cite: 5] | Coordinador | H3[cite: 5] |
| `GET /api/cursos` | Consultar el catálogo de cursos[cite: 5] | Autenticado | H4[cite: 5] |
| `POST /api/cursos` | Crear un nuevo curso en el catálogo[cite: 5] | Coordinador | H4[cite: 5] |
| `PATCH /api/cursos/:id` | Editar información o atributos de un curso[cite: 5] | Coordinador | H4[cite: 5] |
| `DELETE /api/cursos/:id` | Desactivar o eliminar un curso del catálogo | Coordinador | H4[cite: 5] |
| `GET /api/certificados` | Listar los certificados subidos por el usuario activo[cite: 5] | Autenticado | H5[cite: 5] |
| `POST /api/certificados` | Cargar un nuevo certificado (asociando curso de forma opcional)[cite: 5] | Autenticado | H5[cite: 5] |
| `GET /api/solicitudes-certificados` | Obtener la tabla de solicitudes de validación de certificados[cite: 5] | Coordinador | H6[cite: 5] |
| `PATCH /api/solicitudes-certificados/:id` | Aprobar o rechazar la validación de un certificado[cite: 5] | Coordinador | H6[cite: 5] |
| `POST /api/emergencias` | Reportar una nueva emergencia en la vía pública[cite: 5] | **Público** | H7[cite: 5] |
| `GET /api/emergencias` | Listar y filtrar emergencias activas para el mapa[cite: 5] | Autenticado | H8[cite: 5] |
| `GET /api/emergencias/:id` | Obtener detalle y ficha completa de una emergencia[cite: 5] | Autenticado | H8[cite: 5] |
| `GET /api/notificaciones` | Consultar alertas generadas por el sistema[cite: 5] | Autenticado | H9[cite: 5] |
| `PATCH /api/notificaciones/preferencias` | Configurar el envío opcional de notificaciones por email[cite: 5] | Autenticado | H9[cite: 5] |
| `POST /api/emergencias/:id/tomar` | Asignarse y marcar la emergencia como `EN CAMINO`[cite: 5] | Voluntario | H10[cite: 5] |
| `POST /api/emergencias/:id/finalizar` | Registrar informe de atención y marcar como `GESTIONADA`[cite: 5] | Voluntario (asignado)[cite: 5] | H11[cite: 5] |