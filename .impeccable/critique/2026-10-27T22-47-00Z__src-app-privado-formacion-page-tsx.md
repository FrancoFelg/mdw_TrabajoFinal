---
target: formacion
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/home/guillenatali/workdir/uai/mdw_TrabajoFinal/src/app/(privado)/formacion/page.tsx"
target_fingerprint: "sha256:421eefdea08e15739428dd1478e91589e15b673701f191765165308e73d6baa2"
target_path: /home/guillenatali/workdir/uai/mdw_TrabajoFinal/src/app/(privado)/formacion/page.tsx
timestamp: 2026-10-27T22-47-00Z
slug: src-app-privado-formacion-page-tsx
---
Método: dos agentes (A: revisión de diseño · B: detector y evidencia del navegador)

## Salud de diseño: 21/40 (Aceptable)
| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | Aprobar o rechazar hace desaparecer la fila sin confirmación |
| 2 | Coincidencia con el mundo real | 3 | El selector de curso arranca en "Otro" |
| 3 | Control y libertad | 1 | Aprobar o rechazar con un clic, definitivo, sin motivo |
| 4 | Consistencia | 2 | En escritorio la cola se superpone; botones de 40 px |
| 5 | Prevención de errores | 1 | El coordinador puede aprobar su propio certificado; botones a 8 px |
| 6 | Reconocer antes que recordar | 2 | El coordinador solo ve un código: no tiene nada que verificar |
| 7 | Flexibilidad | 2 | Sin tabla ni filtro en escritorio |
| 8 | Estética minimalista | 2 | Columna de 592 px con choques; fechas cortadas |
| 9 | Recuperación de errores | 2 | Una Alert al pie, sin aria-invalid ni foco; el campo vacío sin estilo de error |
| 10 | Ayuda | 2 | Un rechazado no sabe qué hacer |

## Problemas prioritarios
1. [P0] El coordinador puede aprobar su propio certificado (UI, Server Action y PATCH de la API) → excluirlo de la cola y validar quién revisa en el servicio
2. [P1] La cola del coordinador se rompe en escritorio (columna de 92 px para 122 px de texto) → contenedor más ancho y tabla, o minmax(0,1fr)
3. [P1] Validación a ciegas e irreversible: sin adjunto del certificado (historia 5), sin motivo de rechazo (historia 6), sin confirmación
4. [P2] La etiqueta "Pendiente" no alcanza el contraste (4,04:1) → token --blue-ink
5. [P2] Errores al pie y no en el campo; el campo de fecha se desborda a 390; bordes del campo a 1,1:1 dentro del desplegable
Detector: 0 en CLI; overlay: contraste en "Pendiente" y desborde en .cola-dato a 1280.
