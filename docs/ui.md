# Interfaz de Red de Apoyo

La interfaz es mobile first y sigue el estándar de las apps móviles actuales, con Uber como referencia:
- blanco y negro, mapa protagonista y hojas que suben sobre el mapa;
- una acción negra por pantalla;
- modo claro y oscuro: sigue al del dispositivo y se elige a mano con el botón del encabezado (luna o sol) o en Cuenta → Apariencia. La elección vive en la cookie `tema` para que el servidor pinte el tema correcto desde el primer cuadro.

El sistema visual completo está en `DESIGN.md`.

## Pantallas

| Ruta | Para quién | Qué hace |
| :--- | :--- | :--- |
| `/` | Público | Reporte de emergencia: ubicación (GPS o dirección), descripción y dos preguntas opcionales ("¿Responde?", "¿Respira?") de las que se deriva la prioridad (`docs/spec.md`, historia 7). Aviso de llamar al 107/911 con enlaces. Sin cuenta. |
| `/casos` | Con sesión | Mapa arriba y hoja con la lista (en escritorio, lista a la izquierda y mapa a la derecha). Libres o en camino, con filtro por prioridad. Se refresca cada 30 s. Si tenés un caso en camino, aparece primero. Muestra tu ubicación en vivo (punto azul con margen), la distancia a cada caso y el orden "Más cerca" (historia 8: filtro por proximidad). |
| `/casos/[id]` | Con sesión | Detalle, etapas, mapa con tu ubicación, distancia en línea recta y "Cómo llegar". Tomar el caso o finalizarlo con informe. Explica por qué no podés tomarlo (caso rojo sin certificado, otro caso activo, ya tomado). |
| `/formacion` | Con sesión | Tu habilitación para casos rojos (aprobado, en revisión, rechazado o sin certificado), tus certificados con archivo y motivo de rechazo, cargar uno nuevo (foto o PDF obligatorio) y cursos. Coordinación: alta de cursos y aviso de cuántos certificados esperan en Equipo. |
| `/equipo` | Coordinación | Cola de validación: certificados (con su archivo) y pedidos de ascenso (con los certificados de la persona). Tabla en escritorio, tarjetas en el celular. Aprobar pide confirmación; rechazar un certificado pide motivo. Los propios no aparecen. Enlace al directorio `/usuarios`. |
| `/notificaciones` | Con sesión | Avisos (caso rojo nuevo, cola de coordinación, caso sin atender) con no leídos marcados, "Marcar todo como leído" y el interruptor de push para este dispositivo. La campanita del encabezado muestra el contador. |
| `/cuenta` | Con sesión | Identidad (avatar con iniciales), habilitación para casos rojos con su próximo paso, pedido de ascenso con confirmación y estado, y cerrar sesión como última fila. |

En el celular la navegación va en pestañas abajo; desde 960 px sube a la barra superior.

## Componentes y estilos

`src/components/ui/index.tsx` contiene Button, Card, Badge, Input, Skeleton y Alert. `src/components/marcas.tsx` tiene las marcas compartidas: prioridad (disco de color con ícono, más el nombre), estados, código de caso, persona asignada (avatar con iniciales) y etapas. Íconos de `lucide-react`; mapa con Leaflet y teselas de OpenStreetMap en gris (no necesita clave; respetar su política de uso si el tráfico crece). Sin shadcn/ui ni Tailwind: CSS global con una única fuente de tokens en `src/app/globals.css`. La galería `/sistema` muestra las piezas con datos de ejemplo.

## Ubicación del reporte

Con GPS se mandan solo las coordenadas. La provincia la estima el servidor (`estimarProvincia` en `src/lib/casos.ts`): CABA por polígono y el resto por la ciudad de referencia más cercana. Si el margen del GPS supera 100 m, la ubicación se marca como aproximada y se pide una referencia; con la ubicación lista se muestra un mini mapa con el pin. Si el permiso queda sin responder, a los 12 s se pasa a la dirección escrita. Si el GPS falla o se niega el permiso, aparece el campo de dirección sin perder lo escrito. La dirección escrita usa Google Maps del lado del servidor: sin `GOOGLE_MAPS_API_KEY` el reporte avisa que conviene usar la ubicación.

## Foto y audio del reporte

En "¿Qué está pasando?" se puede sacar una foto (se comprime en el teléfono a 1600 px, ~300 KB) y grabar un audio de hasta 60 s (corta solo). Alcanza con escribir lo que pasa o con grabar el audio: si solo hay audio, el servidor lo valida antes de crear el reporte y la descripción remite a él. Se suben junto con el reporte; si fallan, la emergencia igual queda registrada y la confirmación lo avisa. Se sugiere no mostrar la cara. Solo los ven usuarios con sesión, en el detalle del caso (`GET /api/adjuntos/:id`); la lista marca con íconos los casos que los traen. Los archivos van al almacenamiento configurado (`services/almacenamiento.ts`: disco, S3 o Azure).

## Avisos (historia 12)

Los avisos se guardan por persona (`Notificacion`, con clave única para no repetirlos) y se muestran en `/notificaciones`. La campanita del encabezado consulta `GET /api/notificaciones?resumen=1` cada 30 s con la pestaña visible. Los disparadores (`src/lib/avisos.ts`) corren con `after()`, después de responder, para no demorar reportes ni altas:

- **Caso rojo nuevo** → coordinación y voluntarios con certificado aprobado.
- **Certificado o pedido de ascenso nuevo** → coordinación, nunca a quien lo cargó.
- **Caso sin atender** (10 min rojo, 30 amarillo, 120 verde) → coordinación, una sola vez por caso. Se revisa cuando coordinación consulta la campanita.

El push es opcional por dispositivo: `public/sw.js` muestra el aviso y abre el enlace al tocarlo; la suscripción se guarda en `SuscripcionPush` y se borra sola si el navegador la da de baja. En iPhone hace falta agregar la app a la pantalla de inicio (`src/app/manifest.ts`). Sin claves VAPID, la sección de push no aparece y los avisos quedan solo en la app.

## Ubicación en vivo del voluntario

`src/lib/mi-ubicacion.ts` mantiene un único `watchPosition` compartido por el mapa, la lista y el detalle, y lo corta cuando ningún componente lo usa. La posición no se guarda ni se envía al servidor: solo se usa en el dispositivo para dibujar el punto y calcular distancias en línea recta. Si se niega el permiso, la lista lo explica y ofrece reintentar. El mapa se crea una vez y actualiza marcas y ubicación como capas: el refresco de 30 s y el GPS no cambian el encuadre una vez que la persona movió el mapa. "Centrar en mí" vuelve a tu posición.

## Sesión y permisos

El formulario usa una Server Action y el AuthService existente. El JWT se almacena en una cookie HttpOnly, SameSite=Lax, Secure en producción, con duración de ocho horas. `JWT_SECRET` debe estar definido para emitir y verificar tokens. No se guarda el token en localStorage.

La API de login también establece esa cookie y conserva el token en su respuesta para clientes que usan Bearer. Las APIs aceptan Bearer y, para el navegador, la cookie. El directorio requiere coordinador o administrador tanto en la página como en GET `/api/usuarios`. La pantalla consulta UsuarioService en el servidor y envía al cliente solamente identificador, nombre de usuario, nombre, apellido y rol.

El destino después del login se limita a rutas explícitas del sistema. El cierre de sesión elimina la cookie; los tokens Bearer existentes conservan su vigencia hasta expirar, como en el backend original.

## Datos de demo

`pnpm seed` deja la app con contenido para recorrer (ver `AGENTS.md`). Cuentas útiles, todas con clave `demo12345`:

| Usuario | Rol | Para ver |
| :--- | :--- | :--- |
| `demo.coordinador` | Coordinador | Equipo con certificados y ascensos por validar |
| `demo.admin` | Admin | Todo lo de coordinación |
| `demo.sofia` | Voluntaria con certificado aprobado | Puede tomar casos rojos |
| `demo.nicolas` | Voluntario con un caso rojo en camino | "Tu caso en camino" y finalizar |
| `demo.voluntaria` | Voluntaria con certificado y ascenso pendientes | Habilitación "en revisión" |
| `demo.valentina` | Voluntaria con certificado rechazado | Motivo del rechazo |
| `demo.voluntario2` | Voluntario sin certificados | Habilitación "sin certificado" |

## Verificación manual

1. Abrir `/usuarios` o `/casos` sin sesión: debe redirigir a `/login?next=…` y volver ahí después de ingresar.
2. Ingresar con una cuenta existente de coordinador o administrador: debe mostrar el directorio real.
3. Buscar un nombre, un usuario o un rol; probar una búsqueda inexistente y limpiar el filtro.
4. Entrar con una cuenta voluntaria: debe mostrar acceso restringido y ocultar Usuarios en la navegación.
5. Cerrar sesión y volver a abrir el directorio.
6. Recorrer con Tab y Enter; comprobar foco visible y enlace para saltar al contenido.
7. Revisar todas las pantallas a 375 px. La tabla tiene desplazamiento propio para mantener legibles sus columnas.
8. En una base de prueba sin cuentas, verificar el mensaje de directorio vacío. Con la base desconectada, verificar el error y Reintentar.
9. Reportar sin sesión con GPS y con dirección; negar el permiso de ubicación y ver que aparece la dirección.
10. Tomar un caso libre; intentar tomar otro (debe explicar que ya tenés uno); con dos sesiones, tomar el mismo caso a la vez y ver el aviso de que otro lo tomó.
11. Finalizar un caso propio con informe; intentar finalizar con menos de 10 caracteres.
12. Con un voluntario sin certificado aprobado, abrir un caso rojo: el botón queda bloqueado con el motivo.

## Pendientes conocidos

- El informe final se pide en la interfaz, pero `EmergenciaRepository.finalizarEmergencia` no lo guarda: el schema no tiene campo para observaciones.
- La foto del reporte no se ofrece: la API solo acepta una URL de imagen y no hay servicio para subir archivos.
- No hay endpoint para que un coordinador cambie la prioridad de una emergencia.
