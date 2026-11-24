# Solicitudes de ascenso

La historia 3 de `docs/spec.md` exige registrar el pedido pendiente, evaluarlo y cambiar el rol al aprobar. Impide otro pedido pendiente y pedidos de personas que ya coordinan.

- **Voluntario:** abrir «Mis ascensos» en la navegación (`/ascensos`). «Solicitar ascenso» registra el pedido. El historial incluye pendientes, aprobados y rechazados, sin borrar decisiones anteriores. Un rechazo permite volver a solicitar.
- **Coordinador o administrador:** abrir «Usuarios». Un círculo rojo junto a «Solicitudes» identifica una solicitud pendiente de esa persona. El indicador se carga desde el servidor y se actualiza cada 30 segundos con la pestaña visible.
- **Evaluación:** «Solicitudes» abre `/usuarios/:id/solicitudes`, con todo el historial de esa persona. Solo las pendientes ofrecen «Ascender a Coordinador» y «Denegar ascenso». No se permite resolver una solicitud propia ni modificar una resuelta.
- **Caso en camino:** no se asciende a quien tiene un caso `EN_CAMINO`, porque solo un voluntario puede finalizarlo y el caso quedaría trabado. Aprobar la solicitud o cambiar el rol desde el perfil responde `409` «Tiene un caso en camino: tiene que finalizarlo antes del ascenso.» y la solicitud sigue pendiente. Tomar un caso y ascender bloquean la misma fila del usuario (`asegurarSinCasoEnCamino` en `repositories/emergencia.repository.ts`), así que dos pedidos simultáneos no pueden dejar a un coordinador con un caso en camino.
- **Avisos:** el envío se confirma al solicitante y avisa a coordinación. Aprobar o denegar notifica al solicitante y al coordinador que decidió. Los avisos aparecen en la campana y `/notificaciones`. Se guardan junto con la operación en una transacción; no dependen de Web Push.
- **Errores:** los intentos rechazados por la API generan un aviso para quien actuó y una alerta en pantalla. No crean decisiones falsas en el historial. Si no hay conexión o la base está caída, se muestra la alerta cuando sea posible; no se puede garantizar persistir un aviso sin acceso a la base. Ante un resultado de red incierto, consultar el historial antes de reintentar.
- **Permisos:** la API verifica el rol vigente en la base. Después de aprobarse un ascenso, volver a iniciar sesión actualiza el rol del JWT y la navegación.

API: `POST /api/solicitudes-ascenso`, `GET /api/solicitudes-ascenso`, `POST /api/solicitudes-ascenso/:id/aprobar` y `POST /api/solicitudes-ascenso/:id/rechazar`. El listado devuelve solo solicitudes propias a voluntarios; coordinación puede consultar todo o filtrar con `?usuarioId=...`. Nunca incluye contraseñas.

No requiere migraciones nuevas. Usa `SolicitudAscenso` y `Notificacion` existentes. Requiere que la migración de notificaciones esté aplicada.

Pruebas: `node --test tests/ascensos.test.cjs` verifica estados, permisos, avisos, historial, duplicados y rollback si falla la persistencia de un aviso. Usa dobles de base de datos; no reemplaza una prueba de concurrencia sobre MySQL real.
