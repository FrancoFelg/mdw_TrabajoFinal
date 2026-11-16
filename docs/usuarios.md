# Gestión de usuarios

El login acepta nombre de usuario o email en el mismo campo. La API admite `nombreUsuario` (cualquiera de ambos valores) o `email`. Los emails se normalizan a minúsculas y son únicos. Las cuentas anteriores conservan email nulo hasta cargarlo en Mi cuenta; pueden seguir entrando por nombre de usuario. La migración `20261116120000_usuario_email` agrega la columna sin modificar cuentas existentes.

Las respuestas JSON de la API pasan por `jsonPublico`, que excluye contraseñas y hashes también en relaciones anidadas. Las consultas de certificados y ascensos usan una selección explícita de datos públicos del usuario. El hash se usa exclusivamente en el servidor para verificar credenciales y no se envía al cliente.

Crear una solicitud de ascenso verifica el rol vigente en la base, además de comprobar pendientes. Coordinadores, administradores y usuarios inexistentes no pueden solicitarlo. Esta versión no tiene menú ni vista personal de solicitudes para coordinación; los endpoints administrativos de revisión permanecen disponibles.

Coordinadores y administradores abren Usuarios y seleccionan Ver perfil. Pueden consultar datos de cuenta, nombre, apellido, nacimiento y teléfonos. Editar usuario permite modificar esos datos y elegir Voluntario o Coordinador. Las cuentas administradoras son de consulta y no se modifican desde este módulo.

`GET /api/usuarios/:id` consulta el perfil; `PATCH /api/usuarios/:id` actualiza los campos enviados. Ambos requieren coordinación. El listado también verifica el rol vigente en la base. Un voluntario recibe 403, incluso utilizando un JWT anterior con rol de coordinador. Sin sesión, la API responde 401. Los cambios anidados de persona y teléfonos se guardan junto con la cuenta en una operación Prisma.

Los cuerpos de edición rechazan propiedades desconocidas, rol ADMIN, fechas inexistentes o futuras y campos vacíos. Un nombre de usuario duplicado devuelve 409. Las respuestas no incluyen contraseñas. La sesión del navegador consulta el rol actual para reflejar promociones y descensos sin iniciar sesión nuevamente.

Cualquier usuario autenticado abre Mi cuenta (`/cuenta`) para consultar y editar su nombre de usuario, nombre, apellido, nacimiento y teléfonos. `PATCH /api/usuarios/me` usa exclusivamente la identidad autenticada y rechaza el campo rol, identificadores ajenos y contraseñas. Esta edición personal también está disponible para administradores; la protección de cuentas administradoras se mantiene en la edición desde Usuarios. El email se puede modificar; el documento no existe en el modelo actual.

Mi cuenta y Ver perfil muestran emergencias tomadas, con fecha, estado, prioridad y dirección disponible. El sistema no conserva la identidad del reportante y no puede reconstruir un historial de reportes enviados. Los cursos se obtienen de los certificados recibidos, con estado, código y fecha de emisión. No existe una relación de inscripción a cursos independiente de los certificados. Se excluyen certificados con baja lógica; los estados pendiente, aprobado, rechazado y vencido siguen visibles. Los historiales se consultan en el servidor después del control de acceso al perfil.

Validación automatizada: `node --test tests/usuarios.test.cjs`. Usa una base simulada y verifica autenticación, permisos actuales frente al rol antiguo del token, validación, protección de administradores y exclusión de contraseñas.
