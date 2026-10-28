---
target: cuenta
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/home/guillenatali/workdir/uai/mdw_TrabajoFinal/src/app/(privado)/cuenta/page.tsx"
target_fingerprint: "sha256:6ea708f8fa6fd8e2e9fb975a3c04d9e9359064470ea14cd6df59a2eabd6e853b"
target_path: /home/guillenatali/workdir/uai/mdw_TrabajoFinal/src/app/(privado)/cuenta/page.tsx
timestamp: 2026-10-27T22-47-00Z
slug: src-app-privado-cuenta-page-tsx
---
Método: dos agentes (A: revisión de diseño · B: detector y evidencia del navegador)

## Salud de diseño: 22/40 (Aceptable)
| # | Heurística | Puntaje | Problema clave |
|---|---|---|---|
| 1 | Visibilidad del estado | 2 | "Casos rojos" ignora un certificado PENDIENTE; falta loading.tsx |
| 2 | Coincidencia con el mundo real | 3 | Voseo y lenguaje claro |
| 3 | Control y libertad | 2 | "Pedir ascenso" se envía con un toque, sin confirmar ni retirar |
| 4 | Consistencia | 2 | El avatar muestra la "D" de demo.*; no usa las listas agrupadas de DESIGN.md |
| 5 | Prevención de errores | 2 | "Cargá un certificado" invita a duplicar uno pendiente |
| 6 | Reconocer antes que recordar | 2 | No se ve el certificado pendiente |
| 7 | Flexibilidad | 2 | El enlace no abre el formulario de carga |
| 8 | Estética minimalista | 3 | Limpio pero ralo; el aviso se parte en 3 columnas a 390 |
| 9 | Recuperación de errores | 2 | Un ascenso rechazado no dice motivo ni qué hacer |
| 10 | Ayuda | 2 | No explica el camino para habilitarse en casos rojos |

## Problemas prioritarios
1. [P1] El estado "Casos rojos" miente con un certificado pendiente → componente <Habilitacion> con 3 estados, compartido con /formacion
2. [P2] Lejos del estándar de cuenta tipo Uber: identidad con avatar e iniciales reales, filas agrupadas, "Cerrar sesión" como fila
3. [P2] Ascenso sin confirmación y rechazo sin salida
4. [P2] El aviso de habilitación se rompe en 390
5. [P3] Falta loading.tsx
Detector: 0 en CLI; overlay: contraste bajo en la etiqueta "Pendiente" (4,0:1).
