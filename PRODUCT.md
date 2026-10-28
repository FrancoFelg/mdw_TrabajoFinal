# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Tres audiencias, sin una prioritaria: cada surface se diseña para la suya.

- **Transeúnte o vecino (sin cuenta).** Está en la vía pública, desde el celular, frente a una persona en situación de calle o vulnerabilidad que necesita ayuda. Su trabajo es reportar la emergencia rápido: descripción, foto opcional y ubicación (GPS o dirección manual).
- **Voluntario / asistente.** Acude al lugar. Consulta el mapa o el listado de emergencias sin gestionar, toma un caso (pasa a `EN CAMINO`), lo cierra con un informe (`GESTIONADA`). Además sube sus certificados de capacitación y puede pedir ascenso a coordinador. Uso mayormente móvil y en campo.
- **Coordinador / admin.** Gestiona la red de apoyo: valida certificados, aprueba o rechaza ascensos, administra el catálogo de cursos, gestiona usuarios y reordena prioridades de emergencias.

## Product Purpose

Centralizar los pedidos de asistencia comunitaria a personas en situación de calle, que hoy circulan por llamados informales y grupos de mensajería desordenados. El sistema registra cada emergencia geolocalizada, la prioriza por gravedad (`ROJO`, `AMARILLO`, `VERDE`), muestra en tiempo real quién va en camino y certifica la capacitación de quienes asisten.

Éxito: ninguna emergencia queda desatendida, no hay dos voluntarios superpuestos en el mismo caso, y los casos críticos los atiende gente con capacitación validada.

Es el trabajo final de Metodologías de Desarrollo Web (MDW), UAI, desarrollado por un equipo de cuatro personas. La spec completa vive en `docs/spec.md` y manda: lo que no está ahí no se implementa.

## Positioning

Un solo circuito entre quien ve la emergencia en la calle y quien va a atenderla: el reporte no exige cuenta, la asignación es exclusiva (un caso, un voluntario; un voluntario, un caso activo) y los casos `ROJO` solo los puede tomar alguien con un certificado aprobado.

## Operating Context

- Reporte público desde la calle, en el celular, posiblemente con GPS fallando o mala conexión.
- Voluntarios en movimiento, consultando mapa y listado, tomando y cerrando casos desde el teléfono.
- Coordinadores en escritorio revisando colas de certificados y solicitudes de ascenso.
- Flujo principal: reporte → voluntario consulta mapa/listado → toma el caso → finaliza con observaciones → (eventualmente) solicita ascenso.

## Capabilities and Constraints

- Next.js (App Router) + Prisma + MySQL; API REST con JWT Bearer (8 h). Roles: `ADMIN`, `COORDINADOR`, `VOLUNTARIO`. Documentada en `README.md` y `docs/api.md`.
- Producción en `https://mdw.guillermonatali.com`, deploy continuo desde `main`.
- Estados de emergencia: `SIN GESTIONAR`, `EN CAMINO`, `GESTIONADA`, `CANCELADA`. Al pasar a `GESTIONADA` sale de la vista activa.
- Estados de certificado: `PENDIENTE`, `APROBADO`, `RECHAZADO`, `VENCIDO`. Ascenso: `PENDIENTE`, `APROBADO`, `RECHAZADO`.
- Reporte de emergencia en 3 toques o menos. Si falla el GPS se destaca la entrada manual sin perder lo ya cargado.
- "Tomar emergencia" debe ser una acción clara y accesible en móvil. Si otro voluntario la toma al mismo tiempo, se bloquea y se informa.
- Web responsiva / PWA. Avisos dentro de la app y push del navegador (historia 12). Fuera de alcance: app nativa, chat interno, notificaciones por mail o SMS, inventario, donaciones, firma digital, atención médica oficial.
- Frontend actual (rama `feat/felg/implementacion-front`): inicio, login, registro, directorio de usuarios y galería `/sistema`, con sesión por cookie HttpOnly (`docs/ui.md`). Reporte, mapa, cursos, certificados y ascensos están pendientes.
- Abierto: nombre del producto. El repo dice "mdw" y la interfaz de Franco usa "Red de Apoyo"; falta que el equipo lo confirme.

## Brand Commitments

- Idioma: español, voz rioplatense con voseo ("Reportá una emergencia", "Tomá el caso").
- Nombre: sin confirmar ("mdw" en el repo, "Red de Apoyo" en la interfaz). No inventar otro.
- Estilo visual: el estándar de las apps móviles actuales, con Uber como referencia. Blanco y negro de alto contraste, mapa protagonista, hojas sobre el mapa, una acción negra por pantalla y modo oscuro automático. El equipo lo eligió por sobre metáforas propias.
- No usar el emblema de la Cruz Roja ni cruces rojas: es un emblema protegido y la app no es un servicio médico.
- No hay logo ni assets de marca propios (`public/` solo trae los íconos del scaffold de Next).

## Evidence on Hand

- `docs/spec.md`: problema, roles, entidades, historias de usuario, reglas de negocio y requisitos no funcionales.
- `README.md` y `docs/api.md`: referencia de endpoints con ejemplos.
- No hay testimonios, métricas de uso, organizaciones aliadas ni casos reales. No fabricarlos.

## Product Principles

1. **La emergencia primero.** Reportar y tomar un caso es lo más rápido y obvio de la interfaz; todo lo administrativo queda detrás.
2. **Nunca dos en el mismo caso.** El estado de cada emergencia (quién la tiene, en qué etapa está) siempre es visible y verdadero.
3. **La capacitación habilita.** Los certificados no son trámite: definen quién puede atender los casos críticos, y eso se ve.
4. **Cada surface para su persona.** El transeúnte, el voluntario y el coordinador tienen situaciones distintas; no se les impone la misma pantalla.
5. **Si no está en la spec, no existe.** No se agregan funciones ni afirmaciones fuera de `docs/spec.md`.

## Accessibility & Inclusion

- Operación completa por teclado con foco visible.
- Labels explícitos en todos los formularios.
- Contraste de texto/fondo mínimo 4,5:1.
- Las prioridades `ROJO`, `AMARILLO`, `VERDE` nunca se comunican solo con color: van con texto explícito e ícono distintivo.
