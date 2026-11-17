# Interfaz de Red de Apoyo

La interfaz es mobile first y sigue el estándar de las apps móviles actuales, con Uber como referencia:
- blanco y negro, mapa protagonista y hojas que suben sobre el mapa;
- una acción negra por pantalla;
- modo claro y oscuro: sigue al del dispositivo y se elige a mano con el botón del encabezado (luna o sol). La elección vive en la cookie `tema` para que el servidor pinte el tema correcto desde el primer cuadro.

El sistema visual completo está en `DESIGN.md`.

## Pantallas

| Ruta | Para quién | Qué hace |
| :--- | :--- | :--- |
| `/reportar` | Público, sin cuenta | Reporte en una pantalla, accesible desde Home y desde la pestaña Reportar. Descripción, GPS o dirección manual y foto opcional. Confirmación con código del caso. |
| `/casos` | Con sesión | Mapa arriba y hoja con la lista (en escritorio, lista a la izquierda y mapa a la derecha). Libres o en camino, con filtro por prioridad. Se refresca cada 30 s. Si tenés un caso en camino, aparece primero. Muestra tu ubicación en vivo (punto azul con margen), la distancia a cada caso y el orden "Más cerca" (historia 8: filtro por proximidad). Tocar una marca abre una tarjeta con prioridad, descripción, código, estado y "Ver caso". |
| `/casos/[id]` | Con sesión | Detalle, etapas, mapa con tu ubicación, distancia en línea recta y "Cómo llegar". Tomar el caso o finalizarlo con informe. Explica por qué no podés tomarlo (caso rojo sin certificado, otro caso activo, ya tomado). |
| `/certificados` | Con sesión | "Mis certificados" (pestaña Formación): aviso de si podés tomar casos rojos, una tarjeta por certificado con estado, datos adicionales y motivo de rechazo; ver archivo, editar (pendiente o rechazado) y dar de baja. Ver `docs/certificados.md`. |
| `/certificados/nuevo` | Con sesión | Cargar un certificado sin curso: nombre, entidad emisora, fecha de emisión, número opcional, archivo (PDF o imagen, hasta 5 MB) y datos adicionales del catálogo. Los errores quedan junto al campo sin perder lo cargado. |
| `/certificados/[id]/editar` | Dueño | Mismo formulario precargado; el archivo es opcional. Un certificado aprobado no se edita: la pantalla explica por qué. |
| `/notificaciones` | Con sesión | Avisos (caso rojo nuevo, cola de coordinación, caso sin atender) con no leídos marcados, "Marcar todo como leído" y el interruptor de push para este dispositivo. La campanita del encabezado muestra el contador. |

En el celular la navegación va en pestañas abajo; desde 960 px sube a la barra superior. Cada pantalla nueva suma su pestaña en `src/components/navegacion.tsx`.

## Componentes y estilos

`src/components/ui/index.tsx` contiene Button, Card, Badge, Input, Skeleton y Alert. `src/components/marcas.tsx` tiene las marcas compartidas: prioridad (disco de color con ícono, más el nombre), estados, código de caso, persona asignada (avatar con iniciales) y etapas. Íconos de `lucide-react`; mapa con Leaflet y teselas de OpenStreetMap en gris (no necesita clave; respetar su política de uso si el tráfico crece). Sin shadcn/ui ni Tailwind: CSS global con una única fuente de tokens en `src/app/globals.css`. La galería `/sistema` muestra las piezas con datos de ejemplo.

## Mapa (Leaflet)

`leaflet.css` se carga después de `globals.css`, así que sus reglas empatan o ganan. Por eso los estilos propios del mapa llevan un prefijo con más especificidad: la tarjeta de una marca usa la clase `pop-caso` (se pasa en `bindPopup`) y se arma con nodos del DOM, nunca con `innerHTML`, porque la descripción la escribe quien reporta.

## Inicio provisorio

`/` sigue siendo el inicio de presentación de la base de front. Sus clases (`hero`, `card-grid`, `callout`, `eyebrow`…) están al final de `globals.css`, pasadas a los tokens nuevos. Se borran cuando `/` pase a ser la pantalla de Reportar.

## Avisos (historia 12)

Los avisos se guardan por persona (`Notificacion`, con clave única para no repetirlos) y se muestran en `/notificaciones`. La campanita del encabezado consulta `GET /api/notificaciones?resumen=1` cada 30 s con la pestaña visible. Los disparadores (`src/lib/avisos.ts`) corren con `after()`, después de responder, para no demorar reportes ni altas:

- **Caso rojo nuevo** → coordinación y voluntarios con certificado aprobado. Conectado en `POST /api/emergencias`.
- **Certificado o pedido de ascenso nuevo** → coordinación, nunca a quien lo cargó. Certificados conserva su disparador pendiente de conectar. Ascensos guarda avisos transaccionales al solicitar, aprobar o rechazar; ver `docs/ascensos.md`.
- **Caso sin atender** (10 min rojo, 30 amarillo, 120 verde) → coordinación, una sola vez por caso. Se revisa cuando coordinación consulta la campanita.

El push es opcional por dispositivo: `public/sw.js` muestra el aviso y abre el enlace al tocarlo; la suscripción se guarda en `SuscripcionPush` y se borra sola si el navegador la da de baja. En iPhone hace falta agregar la app a la pantalla de inicio (`src/app/manifest.ts`). Sin claves VAPID, la sección de push no aparece y los avisos quedan solo en la app.

## Ubicación en vivo del voluntario

`src/lib/mi-ubicacion.ts` mantiene un único `watchPosition` compartido por el mapa, la lista y el detalle, y lo corta cuando ningún componente lo usa. La posición no se guarda ni se envía al servidor: solo se usa en el dispositivo para dibujar el punto y calcular distancias en línea recta. Si se niega el permiso, la lista lo explica y ofrece reintentar. El mapa se crea una vez y actualiza marcas y ubicación como capas: el refresco de 30 s y el GPS no cambian el encuadre una vez que la persona movió el mapa. "Centrar en mí" vuelve a tu posición.

## Sesión y permisos

Las rutas públicas (`/`, `/login`, `/registro`, `/reportar`) comparten el layout `(publico)`. Las privadas, incluida `/sistema`, comparten `(privado)`. El layout raíz conserva HTML, tipografía y tema; ambos grupos reutilizan el marco de navegación y contenido. Cada página privada valida sesión con su destino exacto para conservar `next` al iniciar sesión. Los controles de páginas, acciones y API siguen siendo independientes del layout.

El encabezado muestra nombre de usuario y rol vigente junto al avatar. Las rutas públicas conservan la navegación de la cuenta cuando hay sesión.

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
12. En Formación, cargar un certificado con un PDF: aparece Pendiente y "Ver archivo" lo abre en otra pestaña.
13. Subir un `.txt` renombrado a `.pdf`: el error aparece junto al archivo y los demás campos siguen cargados. Un archivo de más de 5 MB se rechaza antes de enviar.
14. Editar un certificado reemplazando solo el archivo: guarda. Con un atributo `NUMERO` en el catálogo, cargar texto en ese dato: lo rechaza.
15. Aprobar el certificado por API (`PATCH`): desaparece "Editar" y el aviso pasa a "Podés tomar casos rojos." Tomar un caso rojo funciona; darlo de baja vuelve a bloquearlo.

Las rutas que todavía no tienen pantalla se documentan en la sección 5 de `docs/spec.md`.

## Reportar una emergencia (historia 7)

`/reportar` registra la emergencia mediante una Server Action pública, sin iniciar sesión. `POST /api/emergencias` conserva el contrato para clientes externos. El caso nace `SIN_GESTIONAR`, con la prioridad elegida: Rojo (Grave), Amarillo (Urgente) o Verde (Puede esperar). Verde queda seleccionado por defecto. La descripción admite entre 5 y 191 caracteres, conforme al campo actual de MySQL. Requiere aplicar la migración `20261115120000_direccion_manual_emergencias` para guardar direcciones textuales y admitir provincia desconocida.

- **GPS:** solicita permiso solo al tocar el botón; espera hasta 10 segundos. La provincia se estima con la función local existente y queda editable. La persona verifica que el incidente esté en ese lugar.
- **GPS denegado, no disponible o vencido:** destaca la dirección manual sin borrar descripción ni foto.
- **Dirección manual:** ofrece sugerencias de Google Maps desde tres caracteres, con espera de 400 ms entre cambios. Se puede elegir una sugerencia o conservar el texto libre. Al enviar se intenta geocodificar la dirección y guardar coordenadas y provincia para mostrar el marcador. Si Google falla o no encuentra el lugar, se conserva la dirección original y el reporte se guarda con coordenadas NULL. Incluí localidad y provincia para evitar ambigüedades. El listado reintenta ubicar casos activos anteriores en lotes rotativos de hasta cinco, una vez por minuto por proceso; sin coordenadas, el caso sigue disponible en la lista. Requiere GOOGLE_MAPS_API_KEY con Places API (New) habilitada para sugerencias y geocodificación; la clave nunca llega al navegador.
- **Conexión interrumpida o respuesta perdida:** conserva el envío en memoria y reintenta la misma clave. La Server Action recibe esa clave como argumento; los clientes de la API usan `Idempotency-Key`. Ambos derivan el mismo identificador estable y la unicidad de MySQL evita duplicados, incluso ante dos solicitudes simultáneas. Mientras el resultado sea incierto, se bloquea la edición para no mezclar dos incidentes. Esta recuperación funciona mientras se conserve abierta la pantalla; no hay cola offline persistente.
- **Foto opcional:** JPG, PNG o WebP, hasta 5 MB. El servidor verifica firma binaria y tamaño. Primero se registra el caso; después se adjunta el archivo. Si falla el adjunto, el caso permanece guardado y aparece Reintentar foto, sin volver a crear la emergencia.
- **Permiso de foto:** la creación entrega una capacidad firmada con `JWT_SECRET`, válida por 24 horas y solo para ese caso. No es un JWT de sesión. Sin secreto, se guarda el reporte pero no se habilitan fotos. La lectura de fotos locales requiere sesión.
- **Persistencia:** los archivos viven en `.data/emergencias` o en `EMERGENCY_UPLOAD_DIR`. El proceso necesita escritura y ese directorio debe conservarse y respaldarse junto a la DB. Producción Docker usa el volumen `emergency_photos` en `/app/uploads`; no incluye fotos en la imagen. Varias instancias requieren almacenamiento compartido.

Verificación automatizada: `node --test tests/reportes.test.cjs`. Las pruebas aíslan DB y Google; comprueban validación, estado/prioridad inicial, errores del proveedor, repetición de envío, permisos y persistencia de archivos temporales.

Verificación manual: abrir Home sin sesión, entrar a Reportar, enviar sin foto usando una dirección válida; luego probar GPS permitido, denegado y timeout. Enviar con foto válida, probar archivo inválido y mayor de 5 MB. Interrumpir la conexión al enviar, recuperarla y reintentar; comprobar que hay un solo caso. Simular almacenamiento sin escritura: debe quedar el caso y permitir reintentar solo la foto. Con sesión, abrir el caso y comprobar la imagen.

## Formación y cierre

`/certificados/nuevo` permite adjuntar PDF o imagen de hasta 5 MB con nombre, entidad emisora, fecha de emisión y número opcional. `/cursos` muestra el catálogo; si un curso terminado otorga certificado, «Cargar mi certificado» abre el mismo formulario con los datos del curso y solo pide el archivo. Coordinación crea, edita y da de baja cursos desde ahí. `/certificados` muestra historial, estado, motivo de rechazo y descarga privada. Coordinación revisa en `/certificados/revisar` y resuelve las pendientes; un rechazo exige motivo. `/formacion` redirige según rol. La API controla propietario, rol vigente y transiciones, y notifica cada decisión.

Los comprobantes se guardan en `.data/certificados` o `CERTIFICATE_UPLOAD_DIR`. Ese directorio necesita escritura, persistencia y respaldo; varias instancias requieren almacenamiento compartido. Las pruebas usan exclusivamente `.data/e2e/certificados`.

El informe final se guarda en `Emergencia.observacionesCierre` y se muestra en el detalle y en el historial del perfil. Solo el voluntario asignado puede cerrar, con informe de 10 a 10000 caracteres. El cambio de estado es condicional para impedir reemplazar el informe por un cierre concurrente.

Para usar estos cambios sobre una instalación existente, aplicar `pnpm exec prisma migrate deploy` y `pnpm exec prisma generate` antes de iniciar la aplicación.

## Solicitudes de ascenso

La navegación incluye «Mis ascensos». En «Usuarios», «Solicitudes» muestra un círculo rojo si hay un pedido pendiente. Abre el historial completo de esa persona, con acciones para aprobar o denegar los pendientes. Detalles y contingencias en docs/ascensos.md.
