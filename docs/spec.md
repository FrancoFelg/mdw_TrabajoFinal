# Especificación del sistema — App de Emergencias Comunitarias

Este documento es el relevamiento de requerimientos del proyecto. Se mantiene actualizado durante todo el desarrollo. **Regla práctica:** si una funcionalidad no está acá, no se implementa.

---

## 1. El problema

* **Para quién:** personas sin hogar o en situación de vulnerabilidad en la vía pública, voluntarios, brigadistas y coordinadores de organizaciones de asistencia social.
* **Qué hace hoy sin el sistema:** el reporte de personas que necesitan ayuda en la calle se hace por llamados informales o grupos de mensajería desorganizados. No hay registro de qué capacitaciones tienen quienes asisten, no se sabe en tiempo real quién está yendo a un lugar ni qué prioridad tiene cada caso, provocando superposición de esfuerzos o emergencias desatendidas.
* **Qué mejora:** centraliza las solicitudes de emergencia en un mapa geolocalizado en tiempo real, prioriza los casos según su gravedad, permite certificar la capacitación de los asistentes (cursos y primeros auxilios) y hace un seguimiento del voluntario que va en camino.

---

## 2. Roles

| Rol | Quién es | Qué puede hacer que el otro no |
| :--- | :--- | :--- |
| **Voluntario / Asistente** | La persona que acude al lugar a brindar apoyo | Subir sus certificados de cursos, postularse/ir a atender una emergencia activa y marcar su resolución |
| **Coordinador / Admin** | El encargado de gestionar la red de apoyo | Crear cursos, aprobar o rechazar certificados de voluntariado y asignar o reordenar prioridades de emergencias |

> **Un tercer actor no tiene cuenta:** quien reporta una emergencia desde la vía pública (un vecino o transeúnte) o consulta la ubicación pública de asistencia. Puede crear el alerta e ingresar las coordenadas/dirección directamente sin registrarse.

---

## 3. Entidades
| Entidad | Qué representa | Se relaciona con |
| :--- | :--- | :--- |
| **Persona** | Los datos filiatorios y de contacto de un individuo | Usuario (1-1) · Certificado (1-N) · Emergencia (1-N como reportador o asistido) |
| **Usuario** | La cuenta de acceso con sus credenciales y su rol definido | Persona (1-1) · Rol (N-1) · Emergencia (1-N como voluntario asignado) |
| **Rol** | El perfil de permisos en el sistema (Voluntario, Coordinador, Admin) | Usuario (1-N) |
| **Emergencia** | El incidente reportado en la vía pública con su descripción y foto | EmergenciaPrioridad (N-1) · EmergenciaEstado (N-1) · Ubicacion (1-1) · Usuario (N-1, asignado) |
| **EmergenciaPrioridad**| El nivel de urgencia del evento: ROJO (crítico), AMARILLO (urgente), VERDE (moderado) | Emergencia (1-N) |
| **EmergenciaEstado** | La etapa en la que está la asistencia: SIN GESTIONAR, EN CAMINO, GESTIONADA, CANCELADA | Emergencia (1-N) |
| **Ubicacion** | Las coordenadas geográficas y la dirección exacta del suceso | UbicacionTipo (N-1) · Emergencia (1-1) |
| **UbicacionTipo** | Categoría del punto: CALLE, CIUDAD, PROVINCIA, PAIS | Ubicacion (1-N) |
| **Curso** | Formación en asistencia, cuidados o primeros auxilios que valida a un voluntario | CursoAtributo (N-N via CursoRelAtributo) · Certificado (1-N) |
| **CursoAtributo** | Características del curso (ej. Horas lectivas, Nivel, Entidad emisora) | Curso (N-N via CursoRelAtributo) |
| **CursoRelAtributo** | Tabla intermedia entre el catálogo de cursos y sus atributos opcionales | Curso (N-1) · CursoAtributo (N-1) |
| **Certificado** | Documento o comprobante subido por el voluntario para acreditar una capacitación | Persona (N-1) · Curso (N-1) · CertificadoEstado (N-1) |
| **CertificadoEstado**| Estado de la validación del certificado: PENDIENTE, APROBADO, RECHAZADO, VENCIDO | Certificado (1-N) |

---

## 4. Historias de usuario

### H1 — Reportar una emergencia en la vía pública
*Como transeúnte o vecino* (Publica), quiero reportar una persona que necesita asistencia en la calle, *para que la red comunitaria pueda acudir a ayudarla.*
* **Criterios de aceptación:**
  * Cuando se envía la descripción, la foto opcional y la ubicación (vía GPS del navegador o dirección de calle), la emergencia queda registrada con estado `SIN GESTIONAR`.
  * Dado que el reportante no seleccionó prioridad, el sistema le asigna por defecto prioridad `VERDE` hasta que la revise un coordinador.
  * **Caso de error:** si la geolocalización no es válida o está fuera de los límites detectables, se exige ingresar manualmente la calle y ciudad.

### H2 — Cargar un certificado de capacitación
*Como voluntario*, quiero subir mi certificado de primeros auxilios o cuidados, *para demostrar que estoy apto para responder a emergencias.*
* **Criterios de aceptación:**
  * Cuando el voluntario selecciona un curso del catálogo y adjunta el archivo (PDF/Imagen), el certificado se guarda en estado `PENDIENTE`.
  * **Caso de error:** si el archivo supera los 5 MB o no es un formato válido (PDF, JPG, PNG), no se guarda y se muestra el motivo.

### H3 — Validar un certificado de un voluntario
*Como coordinador*, quiero revisar los certificados presentados por los voluntarios, *para autorizar su nivel de respuesta.*
* **Criterios de aceptación:**
  * Dado un certificado en estado `PENDIENTE`, cuando el coordinador presiona "Aprobar", pasa a estado `APROBADO` y el voluntario queda habilitado en el sistema con esa capacitación.
  * Dado que el certificado no es válido o legible, cuando el coordinador presiona "Rechazar", debe ingresar un motivo y el certificado pasa a estado `RECHAZADO`.

### H4 — Visualizar y filtrar el mapa de emergencias
*Como voluntario*, quiero ver en un mapa los casos reportados y su prioridad, *para saber dónde se requiere apoyo urgente cerca de mi ubicación.*
* **Criterios de aceptación:**
  * Las emergencias se despliegan en un mapa clasificadas visualmente por su color de prioridad (`ROJO`, `AMARILLO`, `VERDE`).
  * Dado que una emergencia pasa a estado `GESTIONADA`, deja de aparecer en el mapa activo por defecto.

### H5 — Tomar y hacer seguimiento de una emergencia
*Como voluntario*, quiero marcar que voy en camino a atender un caso, *para que los demás sepan que el lugar ya está siendo cubierto.*
* **Criterios de aceptación:**
  * Dado que la emergencia está `SIN GESTIONAR`, cuando el voluntario la toma, el estado cambia a `EN CAMINO` y se le asigna su usuario como responsable.
  * Mientras el voluntario está `EN CAMINO`, la app comparte su posición aproximada al mapa central de la emergencia para dar seguimiento.
  * **Caso de error:** si la emergencia ya fue tomada por otro voluntario mientras leía la ficha, el sistema impide la asignación dual y notifica que el caso ya está en atención.

### H6 — Finalizar la atención de un incidente
*Como voluntario*, quiero dar por cerrada la emergencia indicando las acciones realizadas, *para dejar registro del estado final de la persona asistida.*
* **Criterios de aceptación:**
  * Dado que el voluntario está en el lugar y atendiéndola, cuando presiona "Finalizar" e ingresa observaciones, el estado pasa a `GESTIONADA`.

---

## 5. Flujo principal

1. Un vecino detecta a una persona vulnerada en la calle e ingresa al portal público para reportar la emergencia con la ubicación de la **CALLE**. El sistema registra la **Emergencia** en estado `SIN GESTIONAR`.
2. Un coordinador revisa el reporte desde el panel de control y cambia la **EmergenciaPrioridad** a `ROJO` debido a las condiciones climáticas o de salud reportadas.
3. Un **Usuario** con rol *Voluntario* (que previamente subió un **Certificado** de primeros auxilios en estado `APROBADO`) ve el marcador **ROJO** en el mapa desde su móvil.
4. El voluntario presiona "Acudir al lugar". La emergencia cambia su **EmergenciaEstado** a `EN CAMINO` y se le vincula su **Usuario**.
5. El sistema transmite la ubicación del voluntario hacia el punto de la emergencia para que el coordinador monitoree el seguimiento.
6. El voluntario llega al lugar, brinda la asistencia requerida y presiona "Completar asistencia".
7. La emergencia pasa al estado `GESTIONADA` y se guarda en el historial de la ubicación y del usuario.

---

## 6. Reglas de negocio

1. Un reporte de emergencia no requiere cuenta de usuario, pero la asignación para acudir a resolverla exige obligatoriamente un **Usuario** autenticado.
2. Para tomar una emergencia catalogada con prioridad `ROJO`, el voluntario debe poseer al menos un **Certificado** en estado `APROBADO` en la categoría de Primeros Auxilios o Cuidados Intensivos.
3. Una emergencia en estado `SIN GESTIONAR` solo puede ser tomada por un voluntario a la vez para evitar duplicar recursos.
4. Si una emergencia pasa más de 30 minutos en estado `SIN GESTIONAR` con prioridad `ROJO`, el sistema la escala enviando un alerta sonora/visual al panel del **Coordinador**.
5. Solo los usuarios con rol **Coordinador** o **Admin** pueden cambiar el estado de un **Certificado** de `PENDIENTE` a `APROBADO` o `RECHAZADO`.
6. Un voluntario solo puede tener una emergencia activa en estado `EN CAMINO` de manera simultánea. No puede asignar otra hasta marcar la actual como `GESTIONADA` o cancelarla.
7. Las ubicaciones deben asociarse siempre a su jerarquía geográfica completa: `CALLE` -> `CIUDAD` -> `PROVINCIA` -> `PAIS`.

---

## 7. Requisitos no funcionales

### Usabilidad
* **Eficiencia:** la creación de una emergencia desde la vía pública se completa en **3 toques/clics o menos** habilitando la geolocalización automática por GPS.
* **Errores:** si falla la geolocalización por GPS, se resalta inmediatamente el campo de entrada manual de dirección sin borrar la descripción o foto ingresada.
* **Aprendizaje:** la interfaz móvil del voluntario tiene un botón prominente de acción rápida ("Voy en camino") fácil de presionar en la calle o caminando.
* **Recuerdo:** el mapa interactivo de emergencias activas es la pantalla de inicio para todos los usuarios con sesión iniciada.
* **Satisfacción:** se testeará la carga de reportes en simulacro de campo con voluntarios de una ONG local antes de la puesta en producción.

### Accesibilidad
* Todo se puede operar con el teclado, y se ve dónde está el foco.
* Los campos de formulario tienen label asociado, no solo placeholder.
* Las imágenes que informan (ej. foto de la emergencia) tienen texto alternativo; las decorativas, alternativo vacío.
* El contraste entre texto y fondo llega a 4,5:1 (3:1 si la letra es grande).
* El error o la prioridad nunca se comunica solo con color: la prioridad `ROJO`, `AMARILLO`, `VERDE` siempre va acompañada del texto explícito y un icono distintivo.

---

## 8. Integración externa

* **Procesamiento de Imágenes y Certificados:**
  * **Para qué:** guardado de imágenes adjuntas de las emergencias y archivos PDF/imágenes de los certificados de capacitación.
  * **Qué pasa si se cae:** la emergencia se registra con los datos de texto y coordenadas geográficas; la imagen se omite temporalmente o se reintenta su carga en segundo plano.
* **Mapeo / Geolocalización (Geocoding API):**
  * **Para qué:** convertir la latitud/longitud en una dirección postal humana (`CALLE`, `CIUDAD`) y trazar la ruta de seguimiento.
  * **Qué pasa si se cae:** la app utiliza directamente las coordenadas numéricas (Latitud/Longitud) sin traducir la calle para no interrumpir el flujo.

---

## 9. Fuera de alcance

1. **Atención médica especializada o ambulancias institucionales.** La app es para soporte comunitario/voluntariado; las urgencias médicas graves deben derivarse al sistema público de salud (p. ej. 107/911).
2. **Sistema de mensajería o chat interno en tiempo real.** Se utilizará llamada telefónica o enlace directo a WhatsApp entre voluntario y coordinador.
3. **Gestión de inventario de insumos físicos.** No se controlan cobijas, alimentos o medicamentos entregados.
4. **Validación automática de firmas digitales en certificados.** La validez del certificado la realiza un coordinador de forma visual/manual.
5. **Aplicación nativa (Android/iOS) en tiendas.** El sistema es una aplicación web responsiva (PWA / Next.js) optimizada para navegadores móviles.
6. **Pagos, transferencias o donaciones monetarias dentro de la plataforma.**
7. **Soporte Offline sin conexión a internet.** Se requiere conectividad activa para transmitir la geolocalización y los cambios de estado.