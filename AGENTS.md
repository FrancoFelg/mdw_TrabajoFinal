<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Pruebas y calidad

- `pnpm test`: pruebas unitarias con dobles de datos en `tests/*.test.cjs`.
- `pnpm test:e2e`: Playwright contra la aplicación real y MySQL local exclusivo de pruebas. Lee las 24 filas de `docs/api.md` y verifica sus permisos como anónimo, voluntario, coordinador y administrador. Incluye navegador, usuarios, ascensos y concurrencia.
- `pnpm test:e2e -- tests/e2e/concurrencia.spec.ts`: diez solicitudes simultáneas mediante `Promise.all`, tanto sobre el mismo caso como sobre casos distintos del mismo voluntario.
- `pnpm test:e2e:mutation`: quita temporalmente la condición de estado de la actualización, exige que falle la prueba de concurrencia y restaura el archivo mediante `finally`. No ejecutar junto a otras pruebas ni interrumpirlo durante la mutación.
- Requisitos: MySQL local, dependencias instaladas y `pnpm exec playwright install chromium`. `E2E_DATABASE_URL` debe usar `localhost` o `127.0.0.1` y una base `mdw_e2e` o `mdw_e2e_*`. Sin esta variable, el lanzador toma credenciales locales de `.env` y cambia exclusivamente el nombre a `mdw_e2e`. Nunca ejecuta pruebas contra la base original.
- El lanzador crea la base si falta, aplica migraciones e inicia su propio servidor en `127.0.0.1:3100`. Rechaza servidores existentes. Conserva datos de prueba con identificadores aleatorios para inspección; no borra bases.
- En Windows puede usarse `$env:E2E_BROWSER_CHANNEL='chrome'` para usar Chrome instalado. No se necesitan usuarios especiales ni un modo de testing en la aplicación.
- Resultados: `playwright-report/index.html`, `test-results/results.json`, trazas y capturas ante fallos. Informe versionado: `docs/pruebas-e2e.md`.
- `tests/e2e/certificados.spec.ts` prueba carga PDF, curso opcional, rechazo con motivo, nueva carga, aprobación, habilitación de caso rojo, notificaciones, archivos privados, tamaño/formato y permisos vigentes. Los comprobantes E2E se aíslan en `.data/e2e/certificados`.
- `tests/e2e/clase12.spec.ts` verifica errores por campo, errores de negocio arriba, foco y teclado a 375 px, conservación de datos y archivos, bloqueo durante guardado y rechazo de permisos revocados en Server Actions. La prueba física en teléfono se registra aparte en `docs/clase12.md`.
- CI ejecuta pruebas en cada Pull Request. Los fallos de requisitos deben corregirse; no ocultarlos con `skip`, `fixme` o expectativas de fallo.
- La protección de `main` y la aprobación de otro integrante deben comprobarse en GitHub; un workflow local no prueba que estén habilitadas.
