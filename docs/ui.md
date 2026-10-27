# Interfaz de Red de Apoyo

La interfaz aplica los criterios de la clase 10: navegación con ruta activa, rol visible, componentes compartidos y cinco estados para el directorio.

## Componentes y estilos

`src/components/ui/index.tsx` contiene Button, Card, Badge, Input, Skeleton y Alert. Son componentes propios con elementos HTML nativos; no se instaló shadcn/ui ni Tailwind. Se mantiene CSS global y una única fuente de tokens en `src/app/globals.css`, sin agregar módulos CSS por pantalla. La galería `/sistema` permite revisar variantes y estados sin modificar la base.

## Sesión y permisos

El formulario usa una Server Action y el AuthService existente. El JWT se almacena en una cookie HttpOnly, SameSite=Lax, Secure en producción, con duración de ocho horas. `JWT_SECRET` debe estar definido para emitir y verificar tokens. No se guarda el token en localStorage.

La API de login también establece esa cookie y conserva el token en su respuesta para clientes que usan Bearer. Las APIs aceptan Bearer y, para el navegador, la cookie. El directorio requiere coordinador o administrador tanto en la página como en GET `/api/usuarios`. La pantalla consulta UsuarioService en el servidor y envía al cliente solamente identificador, nombre de usuario, nombre, apellido y rol.

El destino después del login se limita a rutas explícitas del sistema. El cierre de sesión elimina la cookie; los tokens Bearer existentes conservan su vigencia hasta expirar, como en el backend original.

## Verificación manual

1. Abrir `/usuarios` sin sesión: debe redirigir a `/login?next=/usuarios`.
2. Ingresar con una cuenta existente de coordinador o administrador: debe mostrar el directorio real.
3. Buscar un nombre, un usuario o un rol; probar una búsqueda inexistente y limpiar el filtro.
4. Entrar con una cuenta voluntaria: debe mostrar acceso restringido y ocultar Usuarios en la navegación.
5. Cerrar sesión y volver a abrir el directorio.
6. Recorrer con Tab y Enter; comprobar foco visible y enlace para saltar al contenido.
7. Revisar home, login, directorio y galería a 375px. La tabla tiene desplazamiento propio para mantener legibles sus columnas.
8. En una base de prueba sin cuentas, verificar el mensaje de directorio vacío. Con la base desconectada, verificar el error y Reintentar.

Las rutas del flujo de emergencias que todavía no tienen pantalla se documentan en la sección 5 de `docs/spec.md`.
