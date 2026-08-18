# lib/

Infraestructura **compartida y agnóstica del dominio**: cliente de base de datos, validación de variables de entorno, utilidades.

- Acá va `db.ts` cuando elijamos el cliente de datos (mysql2 / Drizzle / Prisma — decisión pendiente).
- Nada de lógica de negocio: eso vive en `features/`.
- Todo lo que toque secretos o conexiones es server-only (marcar con `import "server-only"`).
