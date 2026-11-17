# Trazabilidad de pruebas

Los requisitos provienen de `docs/spec.md`, `docs/api.md`, `docs/ui.md`, `docs/usuarios.md` y `docs/ascensos.md`. Las historias se identifican como H1 a H12 según `docs/spec.md`.

## Recorridos mínimos en navegador

| Recorrido | Criterios verificados | Prueba |
| --- | --- | --- |
| Persona sin cuenta y voluntario | Reporte anónimo con dirección manual, estado SIN_GESTIONAR y prioridad VERDE; registro por formulario; login por email; listado; toma y asignación EN_CAMINO; cierre con informe GESTIONADA; desaparición del listado activo; carga PDF pendiente sin curso; solicitud de ascenso pendiente; edición de perfil propio; logout y bloqueo posterior | `flujos.spec.ts`: persona sin cuenta reporta |
| Coordinador | Cuenta inicial, login por formulario, listado de emergencias, aprobación de una persona y rechazo de otra, persistencia de roles y decisiones, edición de datos del voluntario rechazado, logout y bloqueo posterior | `flujos.spec.ts`: coordinador inicia sesión |

El registro público siempre crea voluntarios. La autoridad del coordinador inicial se prepara directamente en la base E2E; el resto de las acciones del recorrido se realiza por navegador. Las dos personas evaluadas se registran y solicitan ascenso por formulario, en sesiones independientes.

## Cobertura conservada

| Grupo | Requisito que lo respalda |
| --- | --- |
| `permisos.spec.ts` | Roles de las 31 operaciones de `docs/api.md`, H1–H12 |
| `concurrencia.spec.ts` y mutación | H10 y reglas de negocio 5 y 6: un ganador por caso y un caso activo por voluntario |
| `certificados.spec.ts` | H5/H6, regla de negocio 2, archivos y validaciones de `docs/ui.md` y `docs/api.md` |
| `clase12.spec.ts` | Formularios y mutaciones de clase 12 en `docs/tareasPorHacer.md`: validación, persistencia de datos ante errores, guardado, permisos vigentes, teclado y 375 px |
| Otros escenarios de `flujos.spec.ts` | H1/H2: duplicidad, credenciales y privacidad; H3: historial y decisiones; H7: GPS, foto y recuperación documentada; H8/H9: mapa y filtros; H10: certificado para rojo; H11: cierre por asignado e informe |
| `usuarios.test.cjs` | H1/H2/H3, edición y privacidad de `docs/usuarios.md`, sesión y destinos permitidos de `docs/ui.md` |
| `ascensos.test.cjs` | H3/H12 y transacciones, avisos, permisos e historial de `docs/ascensos.md` |
| `reportes.test.cjs` | H7/H8, recuperación de dirección, GPS, fotos, reintentos y persistencia de `docs/ui.md` |

## Exigencias eliminadas

- Test que simulaba errores antiguos de geocodificación y exigía rechazar el reporte. `docs/ui.md` exige conservar la dirección y guardar el caso si Google falla; las pruebas de esa recuperación permanecen.
- Aserción de al menos cinco avisos para una secuencia de ascensos. Los requisitos describen los avisos por operación, sin imponer ese total acumulado.
- Aserción de límite exacto de longitud para el destino de login. Se mantienen un identificador de caso válido y el rechazo de destinos externos.

## Ejecución

Con MySQL local activo, dependencias instaladas y sin otro `next dev` del proyecto:

```powershell
$env:E2E_BROWSER_CHANNEL='chrome'
pnpm test
pnpm test:e2e
pnpm exec playwright show-report playwright-report
```

El lanzador aplica migraciones y regenera Prisma Client antes de iniciar el servidor. Esto evita usar el cliente de otra rama. La suite consulta la base E2E para comprobar persistencia sin sustituir las operaciones de usuario. El reporte JSON queda en `test-results/results.json`; el log del servidor, en `e2e-server.log`.
