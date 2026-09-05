# Especificación del sistema — App de Emergencias Comunitarias

Este documento es el relevamiento de requerimientos del proyecto. Se mantiene actualizado durante todo el desarrollo. **Regla práctica:** si una funcionalidad no está acá, no se implementa.

---

## 1. El problema

* **Para quién:** personas sin hogar o en situación de vulnerabilidad en la vía pública, voluntarios, brigadistas y coordinadores de organizaciones de asistencia social.
* **Qué hace hoy sin el sistema:** el reporte de personas que necesitan ayuda en la calle se hace por llamados informales o grupos de mensajería desorganizados. No hay registro de qué capacitaciones tienen quienes asisten, no se sabe en tiempo real quién está yendo a un lugar ni qué prioridad tiene cada caso, provocando superposición de esfuerzos o emergencias desatendidas.
* **Qué mejora:** centraliza las solicitudes de emergencia en un mapa geolocalizado en tiempo real, prioriza los casos según su gravedad, permite certificar la capacitación de los asistentes (cursos y primeros auxilios), gestiona ascensos a coordinadores, notifica incidencias críticas y hace un seguimiento del voluntario que va en camino.

---

## 2. Roles

| Rol | Quién es | Qué puede hacer que el otro no |
| :--- | :--- | :--- |
| **Voluntario / Asistente** | La persona que acude al lugar a brindar apoyo | Subir sus certificados de cursos, postularse/ir a atender una emergencia activa, solicitar ascenso a coordinador y marcar la resolución de casos |
| **Coordinador / Admin** | El encargado de gestionar la red de apoyo | Crear cursos, aprobar o rechazar solicitudes de certificados y de ascenso a coordinador, configurar notificaciones y reordenar prioridades de emergencias |

> **Un tercer actor no tiene cuenta:** quien reporta una emergencia desde la vía pública (un vecino o transeúnte) o consulta la ubicación pública de asistencia. Puede crear el alerta e ingresar las coordenadas/dirección directamente sin registrarse.

---

## 3. Entidades

Los sustantivos que aparecen en las historias de usuario. De acá sale el modelo de datos.

| Entidad | Qué representa | Se relaciona con |
| :--- | :--- | :--- |
| **Persona** | Los datos filiatorios y de contacto de un individuo | Usuario (1-1) · Certificado (1-N) · Emergencia (1-N como reportador o asistido) |
| **Usuario** | La cuenta de acceso con sus credenciales y su rol definido | Persona (1-1) · Rol (N-1) · Emergencia (1-N como voluntario asignado) · SolicitudAscenso (1-N) · Certificado (N-N via UsuarioCertificado) |
| **Rol** | El perfil de permisos en el sistema (Voluntario, Coordinador, Admin) | Usuario (1-N) |
| **SolicitudAscenso** | Petición enviada por un voluntario para ser promovido a rol Coordinador | Usuario (N-1) · SolicitudAscensoEstado (N-1) |
| **SolicitudAscensoEstado** | Estado del trámite de ascenso: PENDIENTE, APROBADO, RECHAZADO | SolicitudAscenso (1-N) |
| **Emergencia** | El incidente reportado en la vía pública con su descripción y foto | EmergenciaPrioridad (N-1) · EmergenciaEstado (N-1) · Ubicacion (1-1) · Usuario (N-1, asignado) · Notificacion (1-N) |
| **EmergenciaPrioridad**| El nivel de urgencia del evento: ROJO (crítico), AMARILLO (urgente), VERDE (moderado) | Emergencia (1-N) |
| **EmergenciaEstado** | La etapa en la que está la asistencia: SIN GESTIONAR, EN CAMINO, GESTIONADA, CANCELADA | Emergencia (1-N) |
| **Notificacion** | Alerta enviada (vía email u otro medio) tras el reporte o cambio de una emergencia | Emergencia (N-1) · Usuario (N-1, destinatario) |
| **Ubicacion** | Las coordenadas geográficas y la dirección exacta del suceso | UbicacionTipo (N-1) · Emergencia (1-1) |
| **UbicacionTipo** | Categoría del punto: CALLE, CIUDAD, PROVINCIA, PAIS | Ubicacion (1-N) |
| **Curso** | Formación en asistencia, cuidados o primeros auxilios que valida a un voluntario (opcional en certificados) | CursoAtributo (N-N via CursoRelAtributo) · Certificado (1-N) |
| **CursoAtributo** | Características del curso (ej. Horas lectivas, Nivel, Entidad emisora) | Curso (N-N via CursoRelAtributo) |
| **CursoRelAtributo** | Tabla intermedia entre el catálogo de cursos y sus atributos opcionales | Curso (N-1) · CursoAtributo (N-1) |
| **Certificado** | Documento o comprobante subido para acreditar capacitaciones | Persona (N-1) · Curso (N-1, opcional) · CertificadoEstado (N-1) · Usuario (N-N via UsuarioCertificado) · SolicitudValidacionCertificado (1-N) |
| **CertificadoEstado**| Estado de la validación del certificado: PENDIENTE, APROBADO, RECHAZADO, VENCIDO | Certificado (1-N) |
| **UsuarioCertificado** | Tabla de unión que relaciona usuarios con sus certificados asociados | Usuario (N-1) · Certificado (N-1) |
| **SolicitudValidacionCertificado** | Registro explícito de la solicitud enviada por el usuario para validar un certificado | Usuario (N-1) · Certificado (N-1) · CertificadoEstado (N-1) |

---

## 4. Historias de usuario

### 1. Gestión de usuarios
*Como coordinador o administrador*, quiero gestionar las cuentas de los usuarios del sistema, *para mantener actualizados sus perfiles, roles y permisos dentro de la plataforma.*
* **Criterios de aceptación:**
  * Permite listar, consultar y actualizar la información de los usuarios registrados.
  * Permite la asignación y modificación de roles (`Voluntario`, `Coordinador`).
  * **Caso de error:** si se intenta registrar o actualizar un correo o documento existente, el sistema bloquea la operación e informa la duplicidad.

### 2. Inicio de sesión
*Como usuario registrado*, quiero autenticarme con mis credenciales, *para acceder de forma segura a las funciones correspondientes a mi rol.*
* **Criterios de aceptación:**
  * Al ingresar email y contraseña válidos, el sistema inicia la sesión y redirige al panel según el rol del usuario.
  * **Caso de error:** si las credenciales son incorrectas, se muestra un mensaje de error genérico.

### 3. Solicitud de ascensión a coordinador
*Como voluntario*, quiero enviar una solicitud de ascenso, *para ser promovido al rol de coordinador y colaborar en la gestión operativa.*
* **Criterios de aceptación:**
  * La solicitud se registra en `SolicitudAscenso` con estado `PENDIENTE`.
  * Un coordinador/administrador puede evaluar la solicitud, revisando el historial y certificados del voluntario, y aprobarla o rechazarla.
  * Al aprobarse, el rol del usuario cambia a `Coordinador`.
  * **Caso de error:** si el usuario ya cuenta con una solicitud `PENDIENTE` o ya tiene rol `Coordinador`, el sistema impide enviar una nueva.

### 4. Gestión de cursos
*Como coordinador*, quiero dar de alta, modificar y administrar el catálogo de cursos, *para definir los programas de capacitación disponibles.*
* **Criterios de aceptación:**
  * Permite crear, editar y listar cursos indicando título, descripción y horas lectivas.
  * Los cursos sirven como referencia opcional para la posterior validación de certificados.

### 5. Gestionar certificados
*Como usuario*, quiero subir y administrar mis certificados de capacitación, *para demostrar mis competencias ante la organización.*
* **Criterios de aceptación:**
  * El usuario puede adjuntar archivos de sus certificados (PDF/Imagen).
  * El campo `Curso` es **opcional** (se puede vincular a un curso del catálogo o dejarlo vacío para certificados externos/generales).
  * La subida asocia el certificado al usuario mediante la tabla de relación `UsuarioCertificado` y genera automáticamente una solicitud de validación.

### 6. Validar certificados
*Como coordinador*, quiero revisar las solicitudes de validación de certificados, *para verificar la autenticidad de los comprobantes presentados.*
* **Criterios de aceptación:**
  * Se dispone de una tabla de solicitudes de validación (`SolicitudValidacionCertificado`) que relaciona a los usuarios con sus certificados subidos (con `Curso` opcional).
  * El coordinador puede aprobar el certificado (pasa a estado `APROBADO`) o rechazarlo (pasa a `RECHAZADO` indicando un motivo).

### 7. Reportar una emergencia
*Como transeúnte o vecino*, quiero reportar una situación de necesidad en la vía pública, *para solicitar asistencia comunitaria inmediata.*
* **Criterios de aceptación:**
  * No requiere inicio de sesión.
  * Se registra la descripción del incidente, foto opcional y la ubicación (vía GPS o dirección manual).
  * Se genera la emergencia en estado `SIN GESTIONAR` con prioridad por defecto `VERDE`.

### 8. Visualizar mapa de emergencias
*Como voluntario o coordinador*, quiero ver las emergencias activas en un mapa, *para ubicar rápidamente los incidentes reportados en tiempo real.*
* **Criterios de aceptación:**
  * Despliega los marcadores geolocalizados codificados por colores según la prioridad (`ROJO`, `AMARILLO`, `VERDE`).
  * Permite aplicar filtros por prioridad, estado y proximidad.
  * Al pasar a estado `GESTIONADA`, la emergencia se remueve de la vista activa.

### 9. Gestionar notificaciones de emergencias
*Como sistema / coordinador*, quiero generar notificaciones sobre emergencias (opcionalmente enviadas por email), *para alertar oportunamente al personal de asistencia.*
* **Criterios de aceptación:**
  * Cuando se genera una emergencia, debe llegar a los usuarios con rol voluntario una notificación de la misma.

### 10. Tomar emergencia
*Como voluntario*, quiero asignarme y marcar que voy en camino a atender un caso, *para coordinar la atención y evitar la superposición de recursos.*
* **Criterios de aceptación:**
  * Al seleccionar una emergencia `SIN GESTIONAR`, su estado pasa a `EN CAMINO` y se le asigna el `Usuario` del voluntario.
  * **Caso de error:** si otro voluntario la toma simultáneamente, el sistema bloquea la acción e informa la actualización.

### 11. Finalizar atención
*Como voluntario asignado*, quiero registrar el resultado y cerrar el caso, *para dar por concluida la intervención.*
* **Criterios de aceptación:**
  * Dado que la emergencia está `EN CAMINO`, el voluntario ingresa un informe/observación final y actualiza el estado a `GESTIONADA`.

---

## 5. Flujo principal

1. Un transeúnte reporta una persona vulnerada en la calle (**7. Reportar una emergencia**). El sistema registra la **Emergencia** como `SIN GESTIONAR` y genera una **Notificacion** (**9. Gestionar notificaciones de emergencias**).
2. Un voluntario inicia sesión (**2. Inicio de sesión**) y consulta el mapa (**8. Visualizar mapa de emergencias**).
3. El voluntario ha cargado sus comprobantes (**5. Gestionar certificados**) y un coordinador los validó (**6. Validar certificados**).
4. El voluntario ejecuta **10. Tomar emergencia**. El estado cambia a `EN CAMINO` y se le asigna su **Usuario**.
5. Al finalizar la asistencia, ejecuta **11. Finalizar atención** ingresando las observaciones finales; el estado pasa a `GESTIONADA`.
6. Si cumple los requisitos, el voluntario puede recurrir a **3. Solicitud de ascensión a coordinador**, evaluada por la **1. Gestión de usuarios** y coordinadores.

---

## 6. Reglas de negocio

1. Un reporte de emergencia no requiere cuenta de usuario, pero la asignación para acudir a resolverla exige un **Usuario** autenticado.
2. Para tomar una emergencia de prioridad `ROJO`, el voluntario debe poseer al menos un **Certificado** en estado `APROBADO` vinculado a su cuenta vía `UsuarioCertificado`.
3. El campo `Curso` dentro de un `Certificado` es opcional; si no se selecciona un curso del catálogo, se registra como certificado general.
4. Toda subida de certificado por parte de un usuario genera automáticamente un registro en la tabla de solicitudes de validación (`SolicitudValidacionCertificado`) para revisión de los coordinadores.
5. Una emergencia en estado `SIN GESTIONAR` solo puede ser tomada por un voluntario a la vez.
6. Un voluntario solo puede tener una emergencia activa en estado `EN CAMINO` en un momento dado.
7. Las solicitudes de ascensión a coordinador solo pueden ser aprobadas por usuarios con rol `Coordinador` o `Admin`.

---

## 7. Requisitos no funcionales

### Usabilidad
* **Eficiencia:** el reporte de emergencia en vía pública requiere 3 clics/toques o menos.
* **Errores:** si falla el GPS, se destaca la entrada manual sin perder los campos ya completados.
* **Aprendizaje:** botón claro de acción rápida ("Tomar emergencia") accesible en dispositivos móviles.

### Accesibilidad
* Operación completa por teclado con foco visible.
* Labels explícitos en todos los formularios.
* Contraste de texto/fondo mínimo de 4,5:1.
* Los colores de prioridad (`ROJO`, `AMARILLO`, `VERDE`) se acompañan con texto explícito e iconos distintivos.

---

## 8. Integración externa

* **Servicio de Emailing (para notificaciones opcionales):**
  * **Para qué:** envío de correos electrónicos informando emergencias críticas o actualizaciones de estado.
  * **Qué pasa si se cae:** la emergencia e itinerario se registran normalmente en la base de datos; el fallo del mail no interrumpe el flujo operativo.
* **Almacenamiento de Archivos (Certificados y Fotos):**
  * **Para qué:** almacenamiento persistente de imágenes de emergencias y documentos PDF/imágenes de certificados.
  * **Qué pasa si se cae:** la emergencia/solicitud se guarda con sus metadatos y se reintenta la carga del adjunto.

---

## 9. Fuera de alcance

1. Atención médica especializada o servicios de ambulancia oficiales.
2. Sistema de chat o mensajería instantánea interna entre usuarios.
3. Control de inventario físico de insumos (alimentos, prendas, medicamentos).
4. Validación automatizada con firma digital en certificados.
5. Aplicación nativa en tiendas (iOS/Android); el sistema es una PWA/Web responsiva.
6. Donaciones o transacciones monetarias.