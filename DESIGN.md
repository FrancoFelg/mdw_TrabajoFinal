---
name: Red de Apoyo (nombre sin confirmar)
description: App de emergencias comunitarias con el estándar de las apps móviles actuales; mapa primero, una hoja encima y una sola acción negra.
colors:
  bg: "#ffffff"
  bg-2: "#f3f3f3"
  bg-3: "#e8e8e8"
  line: "#e9e9e9"
  text: "#000000"
  text-2: "#5e5e5e"
  accent: "#000000"
  accent-hover: "#333333"
  on-accent: "#ffffff"
  link: "#1f63e0"
  blue: "#276ef1"
  blue-soft: "#eaf1fe"
  blue-ink: "#1a56c4"
  field-border: "#8a8a8a"
  red: "#d4252b"
  red-ink: "#b51f24"
  red-soft: "#fdecec"
  amber: "#f6bc2f"
  amber-ink: "#7a5000"
  amber-soft: "#fef6e1"
  green: "#05944f"
  green-ink: "#047a41"
  green-soft: "#e6f4ec"
  overlay: "#ffffffeb"
typography:
  display:
    fontFamily: "Figtree, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(1.875rem, 7vw, 2.5rem)"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 6vw, 2rem)"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1.3
  meta:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.3
  lead:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.5
  sheet-title:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1.08
    letterSpacing: "-0.03em"
  caption:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.3
  micro:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
  tab:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.2
  pin:
    fontFamily: "Figtree, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
rounded:
  hairline: "2px"
  focus: "4px"
  xs: "6px"
  s: "8px"
  m: "12px"
  l: "16px"
  xl: "24px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  2xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body}"
    rounded: "{rounded.m}"
    padding: "12px 22px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-disabled:
    backgroundColor: "{colors.bg-3}"
    textColor: "{colors.text-2}"
  button-grande:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.m}"
    height: "56px"
    width: "100%"
  button-secondary:
    backgroundColor: "{colors.bg-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.m}"
    padding: "12px 22px"
    height: "52px"
  button-secondary-hover:
    backgroundColor: "{colors.bg-3}"
  button-chico:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
    height: "40px"
  button-peligro:
    backgroundColor: "{colors.red-soft}"
    textColor: "{colors.red-ink}"
    rounded: "{rounded.m}"
    height: "52px"
  input:
    backgroundColor: "{colors.bg-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.m}"
    padding: "12px 14px"
    height: "52px"
  input-focus:
    backgroundColor: "{colors.bg}"
  opcion-fila:
    backgroundColor: "{colors.bg-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.m}"
    padding: "10px 14px 10px 10px"
    height: "64px"
  opcion-icono:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    size: "44px"
  pregunta-opciones:
    backgroundColor: "{colors.bg-2}"
    rounded: "{rounded.m}"
    padding: "4px"
  pregunta-op:
    textColor: "{colors.text-2}"
    rounded: "{rounded.s}"
    height: "44px"
  pregunta-op-elegida:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.s}"
  llamar:
    backgroundColor: "{colors.red-soft}"
    textColor: "{colors.red-ink}"
    rounded: "{rounded.m}"
    padding: "12px 14px"
  disco:
    rounded: "{rounded.pill}"
    size: "24px"
  disco-grande:
    rounded: "{rounded.pill}"
    size: "44px"
  estado-en-camino:
    backgroundColor: "{colors.blue-soft}"
    textColor: "{colors.blue}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "4px 10px 4px 8px"
  estado-gestionada:
    backgroundColor: "{colors.green-soft}"
    textColor: "{colors.green-ink}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "4px 10px 4px 8px"
  estado-neutro:
    backgroundColor: "{colors.bg-2}"
    textColor: "{colors.text-2}"
    typography: "{typography.meta}"
    rounded: "{rounded.pill}"
    padding: "4px 10px 4px 8px"
  revision-rechazado:
    backgroundColor: "{colors.red-soft}"
    textColor: "{colors.red-ink}"
    rounded: "{rounded.pill}"
    padding: "4px 10px 4px 8px"
  codigo-caso:
    backgroundColor: "{colors.bg-2}"
    textColor: "{colors.text-2}"
    typography: "{typography.meta}"
    rounded: "6px"
    padding: "1px 6px"
  avatar-mini:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    size: "32px"
  avatar-mini-propio:
    backgroundColor: "{colors.blue}"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    size: "32px"
  chip:
    backgroundColor: "{colors.bg-2}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 10px 0 8px"
    height: "40px"
  chip-activo:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
  segmentos:
    backgroundColor: "{colors.bg-2}"
    rounded: "{rounded.pill}"
    padding: "4px"
  segmento-activo:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    height: "44px"
  hoja:
    backgroundColor: "{colors.bg}"
    rounded: "{rounded.xl}"
    padding: "20px 16px 32px"
  grupo:
    backgroundColor: "{colors.bg-2}"
    rounded: "{rounded.l}"
    padding: "14px 16px"
  pin:
    backgroundColor: "#000000"
    textColor: "#ffffff"
    rounded: "{rounded.pill}"
    padding: "3px 10px 3px 3px"
  pin-tomado:
    backgroundColor: "{colors.blue}"
    textColor: "#ffffff"
  pestana-activa-escritorio:
    backgroundColor: "{colors.text}"
    textColor: "{colors.bg}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
---

# Design System: Red de Apoyo

> El nombre "Red de Apoyo" es el que muestra hoy la interfaz, pero **no está confirmado** por el equipo (`PRODUCT.md`). No lo sumes a lugares nuevos ni inventes otro.

## Propuesta para el equipo

**Pantallas:** [Red de Apoyo — Pantallas](https://claude.ai/artifact/2umHqEN3VWCsibf6uGZnqL) (Claude Design) · **Design System:** [Red de Apoyo](https://claude.ai/artifact/QZBUDJHpFKpDU3ukjxG2qX) · **Rama:** `feat/guille-nat/diseno-app` · **Para probarlo en local:** `pnpm seed` y entrar con cualquier cuenta `demo.*` (clave `demo12345`).

### La idea en una línea

Que la app se use como Uber y no como un formulario. Quien reporta lo hace en tres toques y sin cuenta. El voluntario abre un mapa, ve qué es grave y qué le queda cerca, y toma el caso con un botón. Coordinación trabaja con colas en lugar de buscar en tablas.

### Por qué esta dirección

- **Es un patrón que todos ya saben usar.** Mapa arriba, una hoja que sube y un botón negro abajo. Nadie tiene que aprender la interfaz en la calle, con frío y apurado.
- **El color se reserva para la gravedad.** La interfaz es blanco y negro, así lo único con color en la pantalla es la prioridad (rojo, amarillo, verde). La prioridad nunca va solo con color: siempre lleva ícono propio y nombre, como pide la spec.
- **Una acción por pantalla.** Siempre hay un solo botón negro y es lo que hay que hacer: "Enviar reporte", "Tomar el caso", "Aprobar".
- **Sirve de noche y sin señal.** Modo oscuro automático o elegido a mano, estados de carga, error y vacío en cada vista, objetivos táctiles de 44 px o más y probado a 375 px.

### Qué hay en Claude Design

| Dónde | Contenido |
| :--- | :--- |
| **Design System** | Los tokens de `src/app/globals.css` con tema claro y oscuro (30 colores, 11 estilos de Figtree, espacios, radios y sombras), 21 componentes con vista previa y guía de uso (prioridad, estado, código y asignado, fila de caso, tu caso en camino, segmentado, filtro de prioridad, botones y campos, fila de opción, llamar ahora, preguntas de estado, foto y audio, etapas, grupo de datos, marcador del mapa, habilitación, aviso, cola de validación, estados de una vista, encabezado y tema) y la guía de marca. |
| **Lienzo · Celular claro** | 17 pantallas a 390 px: reportar, ingresar, crear cuenta, casos, detalle, casos con tu caso en camino, informe final, caso que ya tomó otro, caso gestionado, formación, cuenta, equipo, avisos, usuarios, formación de coordinación, sin permiso y página no encontrada. |
| **Lienzo · Celular oscuro** | Reportar, casos, detalle, formación y cuenta en oscuro, y un tablero interactivo para probar el cambio de tema en ola (Play y tocar la luna). |
| **Lienzo · Escritorio** | Casos, detalle, equipo, reportar, formación y usuarios a 1280 px, y casos en oscuro. |

Cada pantalla del lienzo es el **HTML real de la app** con el mismo CSS y los datos de demo de `pnpm seed`. No es un dibujo aparte: lo que se ve es lo que hay en la rama. Los mapas son fotos de OpenStreetMap con los marcadores reales encima. Los estados que dependen de una interacción (reporte enviado, GPS que falla, grabando audio, cargando, error, rechazo con motivo) se ven en la app o en `/sistema`.

Hay también un [Figma anterior](https://www.figma.com/design/iN8J1pzEqJUr3QFCVADGuv) dibujado a mano. Quedó a medias porque el plan gratuito de Figma limita las ediciones automáticas a 20 por mes. La referencia es Claude Design.

### Pantallas por persona

| # | Pantalla | Ruta | Para quién | Qué resuelve |
| :-- | :--- | :--- | :--- | :--- |
| 01 | Reportar una emergencia | `/` | Transeúnte, sin cuenta | Ubicación (GPS o dirección), qué pasa (texto **o** audio, con uno alcanza), foto opcional y dos preguntas Sí/No/No sé que derivan la prioridad. "Llamá al 107 o al 911" siempre visible. |
| 02 | Reporte enviado | `/` | Transeúnte | Confirmación clara. No promete avisos que no existen. |
| 03 | Casos | `/casos` | Voluntario en la calle | Mapa con su ubicación en vivo, hoja con "Libres / En camino", filtro por prioridad y lista ordenada por gravedad o cercanía. |
| 04 | Detalle de caso | `/casos/[id]` | Voluntario | "Tomar el caso" grande, cómo llegar, foto y audio del reporte y datos. Si otro lo tomó antes, se avisa (409). |
| 05 | Formación | `/formacion` | Voluntario | Estado de habilitación para casos rojos, mis certificados con motivo de rechazo, carga con archivo y cursos. |
| 06 | Equipo | `/equipo` | Coordinación | Cola para validar certificados (con motivo obligatorio al rechazar y sin autovalidación), pedidos de ascenso y personas. |
| 07 | Cuenta | `/cuenta` | Todos con cuenta | Identidad, habilitación, actividad, avisos push, pedir ascenso y cerrar sesión. |
| 08 | Avisos | `/notificaciones` | Todos con cuenta | Caso rojo nuevo, casos sin atender y cola de coordinación. Los no leídos se resaltan. |
| 09 | Ingresar | `/login` | Voluntario y coordinación | Ingreso simple. Aclara que para reportar no hace falta cuenta. |
| 10 | Casos (escritorio) | `/casos` | Coordinación | Lista a la izquierda (440 px), mapa a altura completa y tarjeta flotante del caso elegido. |
| 11 | Equipo (escritorio) | `/equipo` | Coordinación | Las colas en tabla. |
| 12 | Crear cuenta | `/registro` | Quien se suma | Datos personales, usuario y contraseña, con error de campo en línea. Arranca como Voluntario. |
| 13 | Reportar · sin GPS | `/` | Transeúnte | El GPS falló: el aviso dice qué pasó, se destaca la dirección escrita y no se pierde lo cargado. |
| 14 | Reportar · foto y audio | `/` | Transeúnte | Grabando audio (hasta 2 min) con la foto ya cargada; con el audio no hace falta escribir. |
| 15 | Casos · tu caso en camino | `/casos` | Voluntario | Tarjeta negra "Tu caso en camino" con "Finalizar", ubicación en vivo y orden "Más cerca". |
| 16 | Detalle · tu caso en camino | `/casos/[id]` | Voluntario | Etapas del caso, cómo llegar e informe final obligatorio para "Finalizar atención". |
| 17 | Caso ya tomado (409) | `/casos/[id]` | Voluntario | Otro voluntario lo tomó antes: se dice claro y se ve quién va. |
| 18 | Casos · sin casos libres | `/casos` | Voluntario | Vacío con filtro activo y botón para quitarlo. |
| 19 | Cargando | todas | Todos | Esqueletos que ocupan el lugar del contenido. |
| 20 | Error con reintento | todas | Todos | Qué pasó y "Reintentar". |
| 21 | Sin permiso | `/equipo`, `/usuarios` | Voluntario | Acceso restringido y salida a Casos. |
| 22 | Página no encontrada | cualquiera | Todos | Lleva a reportar, que es lo más urgente. |
| 23 | Formación · coordinación | `/formacion` | Coordinación | Sin cursos todavía y el formulario para crear uno, con error de fechas. |
| 24 | Equipo · rechazar con motivo | `/equipo` | Coordinación | Motivo obligatorio antes de "Confirmar rechazo" y aviso de lo que se hizo. |
| 25 | Usuarios | `/usuarios` | Coordinación | Directorio con búsqueda por nombre, usuario o rol. |
| 26 | Avisos · sin avisos | `/notificaciones` | Todos con cuenta | Activar avisos push y vacío "Estás al día". |
| 27 | Cuenta · ascenso y apariencia | `/cuenta` | Voluntario | Confirmación antes de pedir ascenso y el selector Automático / Claro / Oscuro. |

### Flujos principales

1. **Reportar (sin cuenta):** `/` → tocar "Usar mi ubicación" → escribir o grabar qué pasa → "Enviar reporte". Si falla el GPS, se destaca "Escribir la dirección" sin perder lo cargado.
2. **Atender un caso:** aviso o pestaña Casos → caso en el mapa o la lista → "Tomar el caso" (pasa a En camino) → "Cómo llegar" → "Finalizar" con informe → Gestionada.
3. **Habilitarse para casos rojos:** Formación → cargar certificado con archivo → queda En revisión → coordinación lo aprueba en Equipo → la franja de habilitación pasa a verde en Cuenta y Formación.
4. **Coordinar:** campanita o pestaña Equipo → revisar el archivo → Aprobar o Rechazar con motivo.

### Decisiones que necesitamos del equipo

- **Nombre de la app.** "Red de Apoyo" es provisorio. Hasta decidirlo, la marca es solo el nombre en texto, sin logo.
- **Informe final.** La spec lo pide y la pantalla ya lo exige (10 caracteres como mínimo). Pero `finalizarEmergencia` en `services/emergencia.service.ts` recibe las `observaciones` y no las guarda: falta una columna y la migración.
- **Cambiar la prioridad de un caso.** La prioridad sale de las respuestas del reporte. No hay endpoint para que un voluntario o coordinación la corrija en el lugar: ¿lo agregamos a la spec?
- **Cambios en `infra/`.** El volumen de archivos (fotos, audios y certificados) y el límite de subida en nginx necesitan review de los CODEOWNERS.

### Cómo comentar

Dejá comentarios directo en el lienzo de Claude Design, sobre la pantalla o el componente. Si algo cambia en el diseño, se actualiza este archivo y `src/app/globals.css` en el mismo PR.

## Overview

**Creative North Star: "La app de viajes que atiende emergencias"**

La app se usa como una app de viajes: el mapa arriba, una hoja blanca que sube sobre él con lo que importa y una sola acción negra para seguir. Es el estándar de categoría de las apps móviles actuales, elegido por el equipo con Uber como referencia. No hay metáfora propia ni ornamento: blanco y negro de alto contraste, rellenos grises en lugar de bordes y tarjetas, Figtree pesada con tracking negativo y radios generosos (12, 16 y 24 px).

El color está racionado. Vive en el disco de prioridad (rojo, ámbar, verde), en las píldoras de estado y en el azul de "en curso" y de "sos vos". Todo lo demás es negro, blanco y dos grises de relleno. El modo oscuro sale de los mismos tokens, cuando lo pide el sistema o cuando la persona lo elige (`data-theme` en `<html>`): no es un tema aparte sino la misma interfaz invertida.

La densidad es de app móvil: filas de 56 a 64 px, objetivos táctiles de 44 px o más, una columna de 640 px como máximo en las pantallas de formulario y lista. En escritorio (≥960 px) la hoja se vuelve una columna de 440 px a la izquierda y el mapa ocupa el resto a altura completa.

**Key Characteristics:**
- Blanco y negro de alto contraste; grises de relleno (`bg-2`, `bg-3`) en lugar de bordes.
- Mapa protagonista en escala de grises, con hoja de esquinas de 24 px encima.
- Una sola acción negra por pantalla, grande y abajo cuando es la acción del flujo.
- Color solo en prioridad y estado; azul solo para "en curso" y "vos".
- Figtree en 700–800 con tracking negativo para títulos; números tabulares en todo el cuerpo.
- Claro y oscuro desde los mismos tokens.

## Colors

Un sistema monocromo con tres colores de señal y un azul de progreso; el gris hace el trabajo estructural.

### Primary
- **Negro de acción** (`accent`, en oscuro blanco): el botón principal, el ícono circular de la fila de opción principal, la tarjeta "Tu caso en camino", el chip y el segmento activos, y la pestaña activa en escritorio. Es el único "color de marca".

### Secondary
- **Azul de recorrido** (`blue`, con `blue-soft` de fondo): lo que está en curso o es tuyo. Estado "En camino" y revisión "Pendiente", la etapa actual del progreso, el avatar propio, el pin de un caso tomado, el anillo de foco y el cursor de texto.
- **Azul de enlace** (`link`): enlaces de texto subrayados y el valor de "Cómo llegar". No se usa para botones.

### Tertiary (señales de prioridad y resultado)
- **Rojo de gravedad** (`red`, `red-ink` para texto, `red-soft` de fondo): disco de prioridad Rojo; alertas de error, revisión "Rechazado", botón de peligro, borde de campo inválido.
- **Ámbar de atención** (`amber`, `amber-ink`, `amber-soft`): disco de prioridad Amarillo (con ícono negro para contraste); avisos (`.aviso`) y la tarjeta de habilitación pendiente.
- **Verde de calma** (`green`, `green-ink`, `green-soft`): disco de prioridad Verde; estado "Gestionada", revisión "Aprobado", habilitación lograda, ubicación lista y reporte enviado.

### Neutral
- **Blanco de hoja** (`bg`): fondo general, hojas, campos con foco, píldora blanca dentro de la tarjeta negra.
- **Gris de relleno** (`bg-2`): campos, filas de opción, grupos, listas, chips, segmentado, código de caso, estado de fondo del mapa.
- **Gris de presión** (`bg-3`): hover de todo lo que es `bg-2`, botón deshabilitado, tramo de etapa pendiente, contadores.
- **Línea** (`line`): divisores de 1 px entre filas de un grupo y bordes de las barras fijas. Nada más.
- **Texto secundario** (`text-2`): metadatos, etiquetas de grupo, pestañas inactivas.
- **Velo** (`overlay`): fondo translúcido de las barras fijas (barra superior, pestañas, botón de envío fijo, acciones del caso).

### Modo oscuro

Los mismos nombres cambian de valor con `:root[data-theme="dark"]` (elegido a mano) o bajo `prefers-color-scheme: dark` si no se eligió nada (`:root:not([data-theme="light"])`). Los dos bloques de `globals.css` llevan los mismos valores: `bg` #000000, `bg-2` #161616, `bg-3` #262626, `line` #262626, `text` #ffffff, `text-2` #a6a6a6, `accent` #ffffff, `accent-hover` #dddddd, `on-accent` #000000, `link` #6ea0ff, `blue` #5b93ff, `blue-soft` #10224a, `red` #ff4d4f, `red-ink` #ff7a7c, `red-soft` #3a1213, `amber` #ffc043, `amber-ink` #ffc96b, `amber-soft` #33270a, `green` #2fbf71, `green-ink` #5ad493, `green-soft` #0b2a1a, `overlay` #000000e6. `themeColor` acompaña: #ffffff en claro, #000000 en oscuro.

### Named Rules

**The Color Is Signal Rule.** El color vive solo en la prioridad y el estado (y el azul de "en curso" o "vos"). Ningún fondo, título, ícono de navegación ni botón principal lleva color. Si un elemento nuevo pide color, preguntá qué prioridad o estado está diciendo; si no dice ninguno, va en negro o gris.

**The Same Tokens Rule.** Claro y oscuro salen de los mismos tokens de `src/app/globals.css`. Ningún componente escribe un color propio para un modo; si hace falta un valor nuevo, se agrega como token en los dos bloques. La excepción documentada es el pin del mapa, negro en ambos modos para leerse sobre el mapa gris.

**The Never By Color Alone Rule.** Prioridad, estado de emergencia y estado de revisión siempre llevan texto **e** ícono propio: Rojo = octógono con alerta, Amarillo = triángulo, Verde = reloj de arena; Sin gestionar = círculo punteado, En camino = flecha de navegación, Gestionada = círculo con tilde, Cancelada = círculo con cruz.

## Typography

**Display Font:** Figtree (con system-ui, -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** Figtree (la misma familia)

**Character:** Una sola sans geométrica de app móvil, cargada con `next/font` como `--font-texto`. La jerarquía sale del peso y del tamaño, no de una segunda familia: títulos en 800 con tracking negativo, cuerpo en 400, etiquetas en 600. `font-variant-numeric: tabular-nums` en todo el documento para códigos, horas y contadores.

### Hierarchy
- **Display** (800, clamp(1.875rem, 7vw, 2.5rem), 1.08, −0.03em, `text-wrap: balance`): el `h1` de cada pantalla ("Reportá una emergencia"). En la hoja de Casos baja a 1.75rem.
- **Headline** (800, clamp(1.5rem, 6vw, 2rem), 1.15, −0.025em): la descripción del caso como título del detalle, y "Reporte enviado" (1.75rem).
- **Title** (700, 1.25rem, 1.25, −0.015em): `h2` de bloque y las preguntas del reporte ("¿Dónde está la persona?").
- **Body** (400, 1rem, 1.5): texto corrido; `lead` en 1.0625rem con 60ch como máximo.
- **Label** (600, 0.9375rem): etiquetas de campo, nombre de prioridad (700), texto secundario `muted`.
- **Meta** (600, 0.8125rem): píldoras de estado, código de caso, metadatos de fila, encabezados de tabla. Las pestañas móviles bajan a 0.6875rem.
- **Marca** (800, 1.25rem, −0.03em): el nombre en la barra superior, solo texto.

### Named Rules

**The Weight Not Family Rule.** Una sola familia. La jerarquía se hace con 800/700/600/400 y tamaño. No se suma una fuente de display, manuscrita ni monoespaciada.

## Layout

**Móvil primero (375–390 px).** Margen lateral `--gutter` de 16 px (24 px desde 720 px). Las pantallas de formulario y lista usan una columna de hasta 640 px con 20 px arriba (32 px desde 720 px) y 40 px abajo. Ritmo vertical: 6–12 px dentro de un bloque, 16 px entre controles, 24–32 px entre bloques (`reporte` usa 28 px entre pasos).

**Mapa con hoja.** En Casos y en el detalle del caso el contenedor pierde ancho máximo y padding: el mapa ocupa el borde superior (40dvh en Casos, 34dvh en el detalle, mínimo 240/220 px) y la hoja sube sobre él con margen negativo de 24 px y esquinas superiores de 24 px. Un botón redondo flotante de volver (44 px) va sobre el mapa arriba a la izquierda.

**Escritorio (≥960 px).** La barra superior crece a 68 px y las pestañas pasan arriba. Casos y detalle se vuelven una grilla de 440 px + resto a la altura de la ventana menos la barra: hoja a la izquierda con scroll propio, sin radio ni sombra (solo una línea de 1 px a la derecha), y el mapa a la derecha a altura completa. El botón de volver se corre al borde del mapa.

**Barras fijas.** Barra superior fija de 60 px; pestañas inferiores fijas de 64 px más el área segura en móvil. La acción del flujo ("Enviar reporte", "Tomar caso", "Finalizar") va en una barra fija abajo, por encima de las pestañas cuando hay sesión.

**Puntos de corte:** 720 px (margen 24, colas en grilla de 4 columnas) y 960 px (escritorio).

## Elevation & Depth

Plano por defecto: la profundidad se hace con relleno gris sobre blanco. Las sombras aparecen solo donde algo flota sobre el mapa o se separa del resto: la hoja, el botón de volver, los avisos del mapa, los controles y popups de Leaflet, el pin y el segmento elegido. En oscuro las sombras se reemplazan por anillos de 1 px blancos de baja opacidad.

### Shadow Vocabulary
- **Apoyo** (`--shadow-1`: `0 1px 2px #0000000f, 0 2px 8px #00000014`; oscuro `0 0 0 1px #ffffff14`): segmento activo y `.card`.
- **Flotante** (`--shadow-2`: `0 4px 16px #0000001f, 0 1px 3px #00000014`; oscuro `0 0 0 1px #ffffff1a, 0 8px 24px #000000`): botón de volver, avisos sobre el mapa, controles de zoom, popups, enlace de salto.
- **Hoja** (`--shadow-hoja`: `0 -6px 24px #00000024`; oscuro `0 -1px 0 #ffffff1f`): la hoja que sube sobre el mapa.
- **Pin** (`0 2px 8px #00000059`): marcadores del mapa.

### Movimiento

Una sola curva, `--ease: cubic-bezier(.16, 1, .3, 1)`: arranca rápido y frena suave, como las hojas de iOS. El movimiento solo dice que algo pasó o está pasando, nunca decora.

- **Confirmación** (`subir`, 0,5 s): "Reporte enviado" entra subiendo 12 px.
- **Progreso** (`avance`, 2,4 s en bucle): la etapa actual del caso se barre en azul.
- **Ubicación** (`pulso`, 2 s): el punto azul late; mientras busca GPS, el indicador titila (`titila`, 1,2 s).
- **Avisos:**
  - la campanita suena (`sonar`, 0,9 s) cuando llega uno nuevo;
  - el contador aparece con rebote (`contador-aparece`, 0,42 s);
  - en el centro de avisos, cada aviso no leído se resalta en azul suave y se apaga en cascada, con 70 ms entre uno y otro (`resaltar`).
- **Cambio de tema** (`ola-tema`, 0,945 s, `cubic-bezier(.35, 0, .4, 1)`): el tema nuevo se pinta como una ola que entra por la esquina superior izquierda y sale por la inferior derecha. Usa View Transitions con una máscara de degradé diagonal 2,3 veces más grande que la pantalla, que se desliza con `mask-position`. Así el borde suave mide un 30 % de la diagonal, no hay tiempo muerto y anda igual en todos los navegadores. Mientras dura se apagan las demás transiciones. Sin View Transitions o con movimiento reducido, el tema cambia en el acto.
- **Carga:** esqueletos con barrido (`barrido`, 1,4 s) y spinner (`girar`) en los botones mientras esperan.

Con `prefers-reduced-motion: reduce` todas las animaciones duran un instante y el spinner se apaga. El estado final siempre es visible sin animación.

### Named Rules

**The Glass Only On Bars Rule.** El vidrio (`overlay` + `backdrop-filter: blur`) se usa solo en las barras fijas: barra superior, pestañas inferiores, barra de envío del reporte y acciones del caso. Ninguna tarjeta, hoja ni modal lleva vidrio.

**The Fill Before Shadow Rule.** Para agrupar se usa `bg-2`; la sombra queda para lo que flota sobre el mapa.

## Shapes

Esquinas generosas y una sola familia de formas: rectángulos redondeados para superficies, círculos para íconos y avatares, píldoras para todo lo que se elige o marca.

- **8 px** (`rounded.s`): reservado; el código de caso usa 6 px.
- **12 px** (`rounded.m`): botones, campos, filas de opción, selectores de respuesta, avisos, alertas, popups.
- **16 px** (`rounded.l`): grupos de detalle, listas agrupadas, colas, desplegables, la tarjeta "Tu caso en camino", vacíos, el mapa embebido.
- **24 px** (`rounded.xl`): las esquinas superiores de la hoja sobre el mapa.
- **Píldora** (999 px): chips, segmentado, píldoras de estado, botón chico, pines, pestaña activa en escritorio, "Sin asignar".
- **Círculo**: discos de prioridad, íconos de fila de opción, avatares, botón de volver.

Los bordes no dibujan contenedores: solo hay divisores de 1 px (`line`) entre filas y un borde de 2 px que aparece en estado (foco de campo y campo con error).

## Components

### Buttons
- **Shape:** rectángulo con esquinas de 12 px; el botón chico es píldora.
- **Primary:** negro (`accent`) con texto blanco en 700, 52 px de alto mínimo, 12×22 px de padding, ícono a la izquierda. La versión grande ocupa el ancho y mide 56 px: es la acción del flujo.
- **Hover / Active:** hover a `accent-hover`; al presionar escala a 0.98. Foco: anillo azul de 3 px con 2 px de separación (global).
- **Disabled:** `bg-3` con texto `text-2`. Cuando la acción espera datos, se usa `aria-disabled` con opacidad 0.45 para poder explicar qué falta.
- **Secondary:** relleno `bg-2` con texto negro; hover `bg-3`. Es la segunda opción de una pantalla.
- **Peligro:** `red-soft` con `red-ink`, para rechazar o cancelar.

### Chips
- **Filtro de prioridad:** píldora `bg-2` de 40 px con disco, nombre y contador; activo en negro con texto blanco y el contador invertido. Fila con scroll horizontal en móvil.
- **Segmentado:** cápsula `bg-2` con dos segmentos de 44 px; el elegido es blanco con sombra de apoyo y contador negro.

### Cards / Containers
- **Hoja:** blanca, esquinas superiores de 24 px, sombra de hoja, padding 20×16×32, sube 24 px sobre el mapa.
- **Grupo de detalle:** relleno `bg-2`, esquinas de 16 px, filas de 56 px con etiqueta gris a la izquierda y valor en 600 a la derecha, divididas por `line`. Una fila enlace lleva el valor en azul de enlace y hover `bg-3`.
- **Listas agrupadas y colas** (formación, equipo, cuenta): el mismo tratamiento que el grupo.
- **Tu caso en camino:** tarjeta negra de 16 px con disco grande, título chico al 70 % y una píldora blanca "Finalizar". En Casos es la acción negra de la pantalla.
- **Vacío:** bloque `bg-2` de 16 px con título, explicación y, si aplica, botón secundario.

### Inputs / Fields
- **Style:** relleno `bg-2`, sin borde visible (2 px transparente), 12 px de radio, 52 px de alto; hover `bg-3`; cursor azul. Etiqueta explícita arriba en 600.
- **Focus:** fondo blanco y borde de 2 px en `text`.
- **Error:** borde `red` con `aria-invalid`; mensaje en `red-ink` 600.
- **Con ícono:** ícono gris a 14 px del borde izquierdo y texto a 44 px.

### Navigation
- **Barra superior:** solo el nombre en texto (sin logo ni cruz) a la izquierda y un avatar de 40 px con la inicial que lleva a `/cuenta`; sin sesión, un botón chico "Ingresar". Vidrio con línea inferior.
- **Móvil:** pestañas fijas abajo con ícono de 24 px y texto de 11 px; la activa sube a negro y trazo 2.4, las demás `text-2` y trazo 1.8.
- **Escritorio (≥960 px):** las pestañas pasan a la barra superior como fila; la activa es una píldora negra con texto blanco y hover `bg-2`.

### Marcas de caso (signature)
- **Disco de prioridad:** círculo de 24 px (44 px en grande) con el color de la prioridad y el ícono propio en blanco (negro sobre ámbar). Va a la izquierda de cada fila de caso.
- **Marca de prioridad:** disco + nombre en 700, con detalle opcional en gris ("Rojo · Grave").
- **Píldora de estado / revisión:** píldora con ícono de 15 px y texto en 600; En camino y Pendiente en azul suave, Gestionada y Aprobado en verde suave, Rechazado en rojo suave, Sin gestionar, Cancelada y Vencido en gris.
- **Código de caso:** chip gris de 6 px con `#XXXX` en 700, igual en lista, mapa y detalle.
- **Asignado:** avatar de 32 px con iniciales en negro (azul y "Vos" si es el usuario); sin asignado, una píldora gris "Sin asignar".
- **Etapas:** tres barras de 4 px (Reportada, En camino, Gestionada); las hechas en negro, la actual en azul con un barrido animado de 2.4 s, las siguientes en `bg-3`.

### Reporte
- **Fila de opción:** como las sugerencias de destino de una app de viajes: fila `bg-2` de 64 px con ícono negro circular de 44 px, título en 600 y subtítulo gris. La secundaria es transparente con ícono gris de 36 px. Con la ubicación lista, el ícono pasa a verde.
- **Campanita:** botón redondo de 44 px en el encabezado, junto al avatar, con contador rojo (`red`, borde del color de fondo) que muestra hasta "9+".
- **Aviso:** fila de la lista agrupada con ícono en disco de 40 px según el tipo (caso rojo en `red`, sin atender en `amber`, validación en `blue-soft`), título, texto, "hace…" y un punto azul si no se leyó; los no leídos van sobre `bg`, los leídos sobre `bg-2`.
- **Habilitación para casos rojos:** franja de 16 px de padding y radio 16 con ícono de escudo y dos líneas (título y próximo paso). Cuatro estados: aprobado (`green-soft`/`green-ink`), en revisión (`blue-soft`/`blue-ink`), rechazado (`red-soft`/`red-ink`) y sin certificado (`amber-soft`/`amber-ink`); los dos últimos enlazan al formulario de carga. Misma pieza en Cuenta y Formación.
- **Cola de validación (Equipo):** tabla sobre `bg-2` en escritorio, tarjetas apiladas en el celular. Nada se decide de un toque: aprobar abre una confirmación en la fila; rechazar un certificado abre el campo de motivo y "Confirmar rechazo" en `red` lleno. Al terminar, un aviso verde arriba de la cola dice qué se hizo.
- **Identidad (Cuenta):** avatar de 72 px negro con las iniciales del nombre real, nombre en 28 px / 800 y "@usuario · Rol". Debajo, filas agrupadas; "Cerrar sesión" es la última fila, en `red-ink`.
- **Mi ubicación:** punto azul (`blue`) de 22 px con borde blanco, pulso suave y círculo de precisión al 10 %; botón redondo "Centrar en mí" abajo a la derecha del mapa. En la lista, la distancia va en negrita al principio de la meta ("a 850 m") y aparece el orden "Más graves primero / Más cerca".
- **Preguntas de estado:** "¿Responde si le hablás?" y "¿Respira con normalidad?", cada una con un selector segmentado Sí / No / No sé sobre `bg-2`. La respuesta elegida se rellena en negro y la marca sale de una clase que pone React, no de `:has()`. La prioridad se deriva de las respuestas (`docs/spec.md`, historia 7) y se muestra debajo con su disco.
- **Llamar ahora:** franja `red-soft` con ícono de teléfono y enlaces `tel:` al 107 y al 911, debajo del texto inicial y repetida al derivarse Rojo.
- **Errores de campo:** texto `red-ink` con ícono junto al campo, que además se marca con `aria-invalid` y borde rojo. Al enviar con errores, el foco va al primer campo con problema.
- **Ubicación aproximada:** cuando el margen del GPS supera 100 m, el ícono de la fila pasa a ámbar y se pide una referencia; con la ubicación lista aparece un mini mapa de 180 px con el pin "Acá".
- **Envío fijo:** barra de vidrio pegada abajo con el botón grande negro y la aclaración "No hace falta tener cuenta".

### Mapa
- Teselas de OpenStreetMap en escala de grises (invertidas en oscuro), así el único color del mapa son las prioridades.
- **Pin:** píldora negra con el código en 12 px/700 y un disco de prioridad a la izquierda que crece con la gravedad (Rojo 30 px, Amarillo 26 px, Verde 22 px) con la misma forma que el ícono de la lista. Un caso tomado pasa a píldora azul.
- Controles y popups en blanco con radio de 12 px y sombra flotante.

## Do's and Don'ts

### Do:
- **Do** dejar una sola acción negra por pantalla; lo demás va en relleno gris (`button-secondary`) o como enlace.
- **Do** poner el color solo en prioridad y estado, y siempre junto a texto e ícono propio.
- **Do** agrupar con relleno `bg-2` y esquinas de 16 px, con divisores de 1 px entre filas.
- **Do** usar el mapa arriba con la hoja de 24 px encima en móvil, y la columna de 440 px + mapa a altura completa desde 960 px.
- **Do** sacar todo valor nuevo de los tokens de `globals.css` y definirlo en el bloque claro y en el oscuro.
- **Do** mantener objetivos táctiles de 44 px o más y probar a 375 px.
- **Do** respetar `prefers-reduced-motion`: el barrido de etapas, los esqueletos y las entradas se apagan.

### Don't:
- **Don't** usar color en fondos, títulos, navegación o en el botón principal.
- **Don't** agregar ornamento: texturas, ilustraciones, gradientes decorativos, bordes de tarjeta o sombras sobre superficies que no flotan.
- **Don't** usar vidrio (`backdrop-filter`) fuera de las barras fijas.
- **Don't** usar el emblema de la Cruz Roja ni cruces rojas, ni un logo inventado: la marca es solo el nombre en texto.
- **Don't** distinguir prioridades o estados solo por color.
- **Don't** sumar una segunda familia tipográfica.
- **Don't** escribir colores fijos para un modo dentro de un componente.
