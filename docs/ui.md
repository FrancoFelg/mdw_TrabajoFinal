# Interfaz de Red de Apoyo

La interfaz es mobile first y sigue el estándar de las apps móviles actuales, con Uber como referencia:
- blanco y negro, mapa protagonista y hojas que suben sobre el mapa;
- una acción negra por pantalla;
- modo claro y oscuro: sigue al del dispositivo y se elige a mano con el botón del encabezado (luna o sol). La elección vive en la cookie `tema` para que el servidor pinte el tema correcto desde el primer cuadro.

El sistema visual completo está en `DESIGN.md`.

## Pantallas

| Ruta | Para quién | Qué hace |
| :--- | :--- | :--- |
| `/casos` | Con sesión | Mapa arriba y hoja con la lista (en escritorio, lista a la izquierda y mapa a la derecha). Libres o en camino, con filtro por prioridad. Se refresca cada 30 s. Si tenés un caso en camino, aparece primero. Muestra tu ubicación en vivo (punto azul con margen), la distancia a cada caso y el orden "Más cerca" (historia 8: filtro por proximidad). |
| `/casos/[id]` | Con sesión | Detalle, etapas, mapa con tu ubicación, distancia en línea recta y "Cómo llegar". Tomar el caso o finalizarlo con informe. Explica por qué no podés tomarlo (caso rojo sin certificado, otro caso activo, ya tomado). |
| `/notificaciones` | Con sesión | Avisos (caso rojo nuevo, cola de coordinación, caso sin atender) con no leídos marcados, "Marcar todo como leído" y el interruptor de push para este dispositivo. La campanita del encabezado muestra el contador. |

En el celular la navegación va en pestañas abajo; desde 960 px sube a la barra superior. Cada pantalla nueva suma su pestaña en `src/components/navegacion.tsx`.

## Componentes y estilos

`src/components/ui/index.tsx` contiene Button, Card, Badge, Input, Skeleton y Alert. `src/components/marcas.tsx` tiene las marcas compartidas: prioridad (disco de color con ícono, más el nombre), estados, código de caso, persona asignada (avatar con iniciales) y etapas. Íconos de `lucide-react`; mapa con Leaflet y teselas de OpenStreetMap en gris (no necesita clave; respetar su política de uso si el tráfico crece). Sin shadcn/ui ni Tailwind: CSS global con una única fuente de tokens en `src/app/globals.css`. La galería `/sistema` muestra las piezas con datos de ejemplo.

## Avisos (historia 12)

Los avisos se guardan por persona (`Notificacion`, con clave única para no repetirlos) y se muestran en `/notificaciones`. La campanita del encabezado consulta `GET /api/notificaciones?resumen=1` cada 30 s con la pestaña visible. Los disparadores (`src/lib/avisos.ts`) corren con `after()`, después de responder, para no demorar reportes ni altas:

- **Caso rojo nuevo** → coordinación y voluntarios con certificado aprobado. Conectado en `POST /api/emergencias`.
- **Certificado o pedido de ascenso nuevo** → coordinación, nunca a quien lo cargó. `avisarCertificadoNuevo` y `avisarAscensoNuevo` quedan listos para conectarlos desde esas pantallas.
- **Caso sin atender** (10 min rojo, 30 amarillo, 120 verde) → coordinación, una sola vez por caso. Se revisa cuando coordinación consulta la campanita.

El push es opcional por dispositivo: `public/sw.js` muestra el aviso y abre el enlace al tocarlo; la suscripción se guarda en `SuscripcionPush` y se borra sola si el navegador la da de baja. En iPhone hace falta agregar la app a la pantalla de inicio (`src/app/manifest.ts`). Sin claves VAPID, la sección de push no aparece y los avisos quedan solo en la app.

## Ubicación en vivo del voluntario

`src/lib/mi-ubicacion.ts` mantiene un único `watchPosition` compartido por el mapa, la lista y el detalle, y lo corta cuando ningún componente lo usa. La posición no se guarda ni se envía al servidor: solo se usa en el dispositivo para dibujar el punto y calcular distancias en línea recta. Si se niega el permiso, la lista lo explica y ofrece reintentar. El mapa se crea una vez y actualiza marcas y ubicación como capas: el refresco de 30 s y el GPS no cambian el encuadre una vez que la persona movió el mapa. "Centrar en mí" vuelve a tu posición.

## Sesión y permisos

El formulario usa una Server Action y el AuthService existente. El JWT se almacena en una cookie HttpOnly, SameSite=Lax, Secure en producción, con duración de ocho horas. `JWT_SECRET` debe estar definido para emitir y verificar tokens. No se guarda el token en localStorage.

La API de login también establece esa cookie y conserva el token en su respuesta para clientes que usan Bearer. Las APIs aceptan Bearer y, para el navegador, la cookie. El directorio requiere coordinador o administrador tanto en la página como en GET `/api/usuarios`. La pantalla consulta UsuarioService en el servidor y envía al cliente solamente identificador, nombre de usuario, nombre, apellido y rol.

El destino después del login se limita a rutas explícitas del sistema. El cierre de sesión elimina la cookie; los tokens Bearer existentes conservan su vigencia hasta expirar, como en el backend original.

## Verificación manual

1. Abrir `/usuarios` o `/casos` sin sesión: debe redirigir a `/login?next=…` y volver ahí después de ingresar.
2. Ingresar con una cuenta existente de coordinador o administrador: debe mostrar el directorio real.
3. Buscar un nombre, un usuario o un rol; probar una búsqueda inexistente y limpiar el filtro.
4. Entrar con una cuenta voluntaria: debe mostrar acceso restringido y ocultar Usuarios en la navegación.
5. Cerrar sesión y volver a abrir el directorio.
6. Recorrer con Tab y Enter; comprobar foco visible y enlace para saltar al contenido.
7. Revisar home, login, directorio y galería a 375px. La tabla tiene desplazamiento propio para mantener legibles sus columnas.
8. En una base de prueba sin cuentas, verificar el mensaje de directorio vacío. Con la base desconectada, verificar el error y Reintentar.
9. Tomar un caso libre; intentar tomar otro (debe explicar que ya tenés uno); con dos sesiones, tomar el mismo caso a la vez y ver el aviso de que otro lo tomó.
10. Finalizar un caso propio con informe; intentar finalizar con menos de 10 caracteres.
11. Con un voluntario sin certificado aprobado, abrir un caso rojo: el botón queda bloqueado con el motivo.

Las rutas que todavía no tienen pantalla se documentan en la sección 5 de `docs/spec.md`.

## Pendientes conocidos

- El informe final se pide en la interfaz, pero `EmergenciaRepository.finalizarEmergencia` no lo guarda: el schema no tiene campo para observaciones.
- El bloqueo de casos rojos enlaza a `/formacion` y el avatar del encabezado a `/cuenta`; esas pantallas las suma su responsable.
