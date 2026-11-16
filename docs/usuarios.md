# Gestión de usuarios

Coordinadores y administradores abren Usuarios y seleccionan Ver perfil. Pueden consultar datos de cuenta, nombre, apellido, nacimiento y teléfonos. Editar usuario permite modificar esos datos y elegir Voluntario o Coordinador. Las cuentas administradoras son de consulta y no se modifican desde este módulo.

`GET /api/usuarios/:id` consulta el perfil; `PATCH /api/usuarios/:id` actualiza los campos enviados. Ambos requieren coordinación. El listado también verifica el rol vigente en la base. Un voluntario recibe 403, incluso utilizando un JWT anterior con rol de coordinador. Sin sesión, la API responde 401. Los cambios anidados de persona y teléfonos se guardan junto con la cuenta en una operación Prisma.

Los cuerpos de edición rechazan propiedades desconocidas, rol ADMIN, fechas inexistentes o futuras y campos vacíos. Un nombre de usuario duplicado devuelve 409. Las respuestas no incluyen contraseñas. La sesión del navegador consulta el rol actual para reflejar promociones y descensos sin iniciar sesión nuevamente.

El voluntario conserva la consulta de su propio perfil mediante `GET /api/usuarios/me`; no puede editarlo mediante PATCH. Email y documento no existen en el modelo actual y no forman parte del formulario.

Validación automatizada: `node --test tests/usuarios.test.cjs`. Usa una base simulada y verifica autenticación, permisos actuales frente al rol antiguo del token, validación, protección de administradores y exclusión de contraseñas.
