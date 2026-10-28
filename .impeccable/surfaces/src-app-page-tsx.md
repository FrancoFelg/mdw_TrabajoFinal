---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/(privado)/casos/page.tsx"]
---

# App completa (reporte, casos, formación, equipo, cuenta)

Modo: Operate. Mobile first; coordinador también en escritorio.
Audiencia y tarea: transeúnte reporta en ≤3 toques; voluntario ve casos libres, toma uno y lo cierra con informe; coordinador valida certificados, ascensos y cursos.
Restricciones: voseo; prioridades y estados con texto + ícono; sin contenido inventado; nombre "Red de Apoyo" sin confirmar.
Historial: el usuario descartó primero el "Pizarrón de guardia" y después su variante oscura. Pidió el estándar de apps móviles modernas, con Uber como referencia.

## Direction contract

THESIS: Una app de emergencias que se usa como una app de viajes: mapa primero, una hoja con lo que importa y una sola acción negra. Rechaza la metáfora ornamental y el dashboard de tarjetas.
OWN-WORLD: Blanco y negro de alto contraste con grises de relleno (#f3f3f3/#e8e8e8). El color vive solo en el disco de prioridad (rojo, ámbar, verde). Figtree pesada con tracking negativo. Radios de 12/16/24, hojas con esquinas de 24 sobre el mapa gris, píldoras negras como marcadores, avatar con iniciales para quien atiende. Modo oscuro por tokens.
STORY: El vecino ve "Usar mi ubicación" como la primera opción y reporta enseguida. El voluntario ve el mapa con los casos, toca uno y lo toma con el botón negro. El coordinador usa listas agrupadas.
FIRST VIEWPORT: Móvil 390. Barra blanca con el nombre y un avatar. "Reportá una emergencia" a 34 px en 800. Fila gris con un ícono negro circular: "Usar mi ubicación". Debajo, la fila "Escribir la dirección", la descripción en un campo gris, la urgencia en 3 tarjetas y "Enviar reporte" negro fijo abajo. En /casos, el mapa ocupa el 40 % y encima va la hoja con el segmentado Libres/En camino, los chips de prioridad y las filas con el disco a la izquierda.
FORM: Estándar de categoría (salida canon), elegido por el usuario con Uber como referencia. seed:8b95401d05c1410f
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
