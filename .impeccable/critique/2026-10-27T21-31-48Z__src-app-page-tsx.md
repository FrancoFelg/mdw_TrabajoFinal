---
target: home
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/home/guillenatali/workdir/uai/mdw_TrabajoFinal/src/app/page.tsx"
target_fingerprint: "sha256:60e66c68cc97a66b56d8067e8d0273a1e795e5dc89d70ea3451ee38755e97dab"
target_path: /home/guillenatali/workdir/uai/mdw_TrabajoFinal/src/app/page.tsx
timestamp: 2026-10-27T21-31-48Z
slug: src-app-page-tsx
---
Método: dos agentes (A: revisión de diseño · B: detector y evidencia del navegador)

## Salud de diseño: 25/40 (Aceptable)
| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | "Buscando…" no termina nunca si se ignora el permiso; 1,4 km de precisión se muestra como "Ubicación lista"; el error de validación aparece fuera de pantalla |
| 2 | Coincidencia con el mundo real | 3 | Preguntas naturales; "Rojo/Amarillo/Verde" es jerga de triage; "Provincia" no le corresponde a un transeúnte |
| 3 | Control y libertad | 3 | Se pasa de GPS a dirección sin perder lo escrito; destildar la urgencia no es descubrible |
| 4 | Consistencia | 3 | El botón al 45 % parece deshabilitado pero envía; la tarjeta elegida se aclara en vez de llenarse |
| 5 | Prevención de errores | 2 | Sin urgencia queda "Puede esperar" en silencio; la provincia estimada falla; se aceptan ubicaciones imprecisas |
| 6 | Reconocer antes que recordar | 3 | Buenos placeholders y ayudas |
| 7 | Flexibilidad | 2 | "Escribir la dirección" no lleva el foco al campo |
| 8 | Estética minimalista | 3 | Limpio; la barra fija tapa las tarjetas; dos caminos para "Ingresar" |
| 9 | Recuperación de errores | 2 | Buenos textos, pero la alerta queda fuera de vista, sin foco ni campo marcado |
| 10 | Ayuda | 2 | No se explica qué implica cada urgencia; el 107/911 aparece recién al final |

## Veredicto de especificidad
Ejecuta bien el estándar Uber, pero le falta lo que define a Uber en ubicación: un mapa con un pin para confirmar. El texto es propio del producto. El detector de código dio limpio en los archivos de la home. El overlay del navegador marcó 1 hallazgo (placeholder de #descripcion a 4,3:1). Hay 19 avisos menores de tokens fuera de DESIGN.md en globals.css.

## Problemas prioritarios
1. [P1] Los errores de validación no se ven: la alerta queda debajo de las tarjetas y no mueve el foco. Arreglo: llevar el foco al primer campo inválido con aria-invalid y un error en línea, o mostrar la alerta arriba del botón. → /impeccable harden
2. [P1] La urgencia elegida puede mostrarse mal: en Firefox el borde de :has(input:checked) no se repintó, Verde quedó tildado y Rojo resaltado. Arreglo: una clase desde el estado de React y una selección llena con tilde. → /impeccable polish
3. [P1] La ubicación no inspira confianza: 1,4 km se muestra como "lista"; la provincia estimada falla (Rosario sale como Entre Ríos; el rectángulo de CABA incluye Avellaneda); un selector de 24 opciones para el transeúnte. Arreglo: sacar el selector, resolver la provincia en el servidor, mostrar un estado "aproximada" en ámbar por encima de 100 m y un mini mapa con pin. → /impeccable shape (+ harden)
4. [P1] El 107/911 llega tarde: aparece solo después de enviar y sin enlace. Arreglo: una línea con tel: debajo del texto inicial y otra al elegir Rojo. → /impeccable clarify
5. [P2] El GPS puede colgarse y el foco se pierde: sin watchdog si se ignora el permiso; disabled saca el foco; el estado no se anuncia. → /impeccable harden

## Señales de alerta por persona
- Casey (celular, una mano): error fuera de pantalla; doble toque para escribir la dirección; botón gris que parece muerto; "lista" a 1,4 km.
- Jordan (primera vez): no sabe qué implica Rojo; "Entre Ríos" estando en Rosario; el "Ingresar" negro sugiere que hace falta cuenta; no se entera del 911 antes de reportar.
- Sam (lector de pantalla y teclado): el botón alternante cambia su etiqueta sin mover el foco; al enviar, el foco cae en body; el error no está asociado a ningún campo; la barra fija tapa las tarjetas al tabular; destildar la urgencia es solo con mouse.

## Observaciones menores
Placeholder #737373 a 4,3:1; botón en aria-disabled a unos 3,4:1; foto opcional prometida en la spec y ausente; "¿Sos voluntario?" duplica "Ingresar"; el escritorio no aprovecha el ancho; 19 tamaños y radios fuera de la escala de DESIGN.md.

## Preguntas
1. ¿Debería el transeúnte poner ROJO, si eso achica los voluntarios que pueden tomarlo?
2. Si el principio es "el mapa primero", ¿no debería esta pantalla tener el pin?
3. ¿Para qué sirve el código del caso si un anónimo no puede consultarlo?
