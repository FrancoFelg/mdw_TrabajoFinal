# features/

Módulos por **dominio de negocio** (screaming architecture): la carpeta grita QUÉ hace la app, no con qué tecnología.

Estructura de cada feature:

```
features/<dominio>/
├── components/   # UI propia del dominio
├── actions.ts    # Server Actions (mutaciones)
├── service.ts    # lógica de negocio
├── repository.ts # acceso a datos (queries)
└── types.ts      # tipos del dominio
```

Reglas:
- `app/` solo enruta y compone; la lógica vive acá.
- Una feature no importa internals de otra feature — solo su API pública.
- Mutaciones → Server Actions; lectura → Server Components llamando al service.
