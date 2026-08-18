# components/

Componentes de UI **compartidos entre features** (botones, inputs, layout shells).

- Presentacionales: reciben datos por props, no conocen la base de datos ni fetchean.
- Server Components por defecto; `"use client"` solo si hay interactividad o hooks.
- Si un componente pertenece a UN solo dominio, va en `features/<dominio>/components/`, no acá.
