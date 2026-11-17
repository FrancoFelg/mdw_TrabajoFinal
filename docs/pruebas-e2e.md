# Validación E2E: clases 13 y 14

Fecha: 16 de noviembre de 2026. Pruebas reales contra Next.js, Chrome y MySQL local exclusivo `mdw_e2e`.

## Resultado

La ejecución final tiene **110 escenarios aprobados, cero fallidos, cero omitidos**: 96 controles de permisos y 14 escenarios funcionales/concurrentes. Incluye los recorridos completos de persona sin cuenta, voluntario y coordinador solicitados. La primera revisión había dado 87 aprobados y 20 fallidos sobre 107 escenarios. Se conserva esa evidencia en `evidencias/primera-ejecucion-e2e.json`; el resultado actual está en `evidencias/ultima-ejecucion-e2e.json`.

Las 34 unitarias, ESLint, TypeScript y el build de producción pasan. La ejecución E2E final comenzó el 17 de noviembre de 2026 a las 01:39:06 UTC (16 de noviembre, 22:39:06 en Argentina) y duró 94,47 segundos, sin casos inestables. La mutación detectó diez tomas exitosas del mismo caso al retirar la condición de estado y restauró el archivo original. Ver `evidencias/mutacion-e2e.json`.

La correspondencia con historias, especificaciones y exigencias eliminadas se documenta en [trazabilidad-tests.md](trazabilidad-tests.md). El lanzador regenera Prisma Client después de las migraciones para evitar errores por clientes de otra rama. Las páginas privadas conservan el destino de login al exigir sesión, sin una redirección genérica previa en el layout.

## Ejecución

Desde la raíz, con MySQL local encendido:

```powershell
pnpm install --frozen-lockfile
pnpm exec prisma generate
$env:E2E_BROWSER_CHANNEL='chrome'
pnpm test
pnpm test:e2e
pnpm exec playwright show-report
```

Chrome debe estar instalado. Como alternativa, ejecutar `pnpm exec playwright install chromium` y omitir `E2E_BROWSER_CHANNEL`.

En Linux, MySQL debe iniciarse con `--lower-case-table-names=1`, igual que producción. Las migraciones históricas mezclan mayúsculas y minúsculas en los nombres de tabla. CI crea un MySQL 8.4 nuevo con esa opción para E2E y para validar migraciones. La opción se configura al inicializar MySQL; no debe cambiarse sobre un directorio de datos existente.

Sin `E2E_DATABASE_URL`, el lanzador toma las credenciales locales de `.env` y cambia el nombre de base a `mdw_e2e`. Una URL explícita debe apuntar a localhost/127.0.0.1 y una base `mdw_e2e` o `mdw_e2e_*`. Rechaza bases remotas y nombres ajenos antes de conectar. El usuario MySQL necesita crear la base o tenerla creada y poder migrarla.

El comando aplica migraciones e inicia su servidor en `127.0.0.1:3100`; rechaza otro servidor existente. Conserva datos con identificadores aleatorios. Las cuentas se registran y autentican normalmente. Los roles de fixtures se preparan en la base aislada; no existen usuarios especiales, tokens fabricados ni modos de testing en la aplicación.

Google Maps y Web Push quedan sin credenciales. Las fotos y comprobantes usan `.data/e2e/emergencias` y `.data/e2e/certificados`. Los originales de desarrollo no se utilizan.

```powershell
pnpm test:e2e tests/e2e/flujos.spec.ts
pnpm test:e2e tests/e2e/certificados.spec.ts --headed
pnpm test:e2e:mutation
```

La mutación modifica temporalmente una condición, exige una falla concreta y restaura el archivo en `finally`. No ejecutar en paralelo ni interrumpirla.

Resultados completos: `playwright-report/index.html`, `test-results/results.json` y `e2e-server.log`. Capturas y trazas se retienen si hay fallos.

## Correcciones verificadas

1. Logout anónimo responde 401, conforme al contrato autenticado.
2. Existen GET y PATCH de solicitudes de certificados, restringidos a coordinación y administración. Se consulta el rol vigente, incluso si el JWT conserva un rol anterior.
3. La finalización acepta POST y conserva PUT por compatibilidad. Exige voluntario asignado e informe de 10 a 10000 caracteres.
4. Un detalle de emergencia inexistente responde 404.
5. Tomar y finalizar comprueban el rol VOLUNTARIO en MySQL. Coordinación recibe 403 y la pantalla bloquea la toma.
6. `/certificados/nuevo` permite cargar comprobantes; `/certificados` muestra historial y motivo de rechazo con descarga privada; coordinación resuelve pendientes en `/certificados/revisar`. Un rechazo exige motivo. `/formacion` redirige según rol.
7. El informe se persiste en `observacionesCierre` y aparece en detalle e historial. Un cierre repetido devuelve 409 y conserva el informe anterior.
8. El aviso de edición de usuario permanece visible después de cambiar el rol; el componente conserva su identidad al refrescar.

Los certificados nuevos nacen PENDIENTE y pertenecen al actor autenticado; el cliente no puede imponer propietario o aprobación. El código es único. Se aceptan PDF/JPG/PNG/WebP hasta 5 MB, con comprobación de firma y tamaño. Un archivo excesivo se drena sin almacenarlo en memoria y responde 413 sin romper la siguiente petición. Si falla el alta en MySQL se elimina el archivo recién guardado.

La solicitud usa el propio registro Certificado, sin una segunda tabla de solicitudes. Estado y motivo conservan el resultado; la interfaz lista pendientes y resueltos. La decisión usa una actualización condicional en transacción y notifica al propietario. Un segundo intento devuelve 409. El PUT antiguo no permite saltarse esa transición. La carga genera aviso a coordinación.

## Cobertura por historia

| Historia | Evidencia y límites |
| --- | --- |
| H1/H2: usuarios y sesión | Registro, login por nombre/email, duplicados, contraseña incorrecta, privacidad de respuestas, perfil propio, edición, rechazo de autoasignación de rol, edición por coordinación, logout desde avatar y Home sin sesión. |
| H3: ascensos | Pendiente, duplicado, rechazo, nueva solicitud, aprobación, cambio de rol, historial y avisos persistidos. Coordinación no ve Mis ascensos. El círculo rojo y cada aviso visual no se certifican de forma exhaustiva. |
| H4: cursos | Matriz de permisos, creación por coordinación y asociación de curso en la carga de certificado. No se certifican edición/eliminación completas ni una pantalla de administración de cursos. |
| H5/H6: certificados | Navegador: PDF externo, descarga, rechazo sin motivo bloqueado, rechazo con motivo, historial, nueva carga asociada a curso y aprobación. API: archivo inválido, exceso de tamaño, código duplicado, propietario forzado ignorado, estado forzado ignorado, archivos privados, permisos vigentes y bloqueo del PUT alternativo. Avisos a coordinación y al propietario comprobados en MySQL. |
| H7: reporte | Sin cuenta; dirección manual sin GPS ni Google; GPS; prioridades; foto PNG; idempotencia sin duplicación. |
| H8/H9: mapa | Marcadores por prioridad, filtro rojo y retiro del caso gestionado. No cubre todas las combinaciones de estado/proximidad ni Google real. |
| H10: tomar | Toma en navegador; rojo bloqueado antes de aprobación y permitido después de cargar/validar realmente; diez voluntarios por caso y diez casos por voluntario. |
| H11: finalizar | Cierre en navegador y por POST/PUT; voluntario ajeno rechazado; informe corto rechazado; persistencia real; cierre repetido bloqueado. |
| H12: avisos | Permisos del listado y avisos persistidos de ascensos/certificados. Push y alertas por antigüedad no quedan certificados exhaustivamente. |

La matriz lee las 31 filas de `docs/api.md` y ejecuta cada una como anónimo, voluntario, coordinador y administrador. Los casos permitidos usan cuerpo vacío o ID inexistente para comprobar acceso antes de validación/recurso. No equivalen al CRUD positivo completo de cada endpoint. La descarga privada tiene comprobaciones funcionales adicionales.

## Clase 13

- E2E del flujo principal y carga/validación de certificados: ejecutados.
- Permisos por cada fila de Rol: 96 casos ejecutados.
- Prueba deliberadamente rota: ejecutada; la mutación produjo diez 200 y falló la aserción de una sola asignación. El script terminó correctamente y restauró el código. Evidencia: `evidencias/mutacion-e2e.json`.
- Exclusivamente base local de pruebas y cuentas normales: verificado.
- CI en cada PR: configurado en `.github/workflows/ci.yml`, con MySQL efímero local, unitarias, mutación, E2E y artefactos. No se ejecutó en GitHub durante esta entrega.
- Comandos documentados en AGENTS.md: actualizado.
- Protección de main y revisión/aprobación de otra persona: pendientes de verificar en GitHub. El workflow no habilita esos controles por sí solo.

## Clase 14

Ambas reglas se verifican mediante diez solicitudes HTTP simultáneas con `Promise.all`:

| Regla | Antes | Después |
| --- | --- | --- |
| Una emergencia admite un voluntario | Diez 200; prueba fallida | Un 200 y nueve 409; una asignación |
| Un voluntario admite un caso EN_CAMINO | Diez 200; prueba fallida | Un 200 y nueve 409; un caso activo |

La evidencia anterior está transcrita en `evidencias/concurrencia-antes.json`. MySQL serializa las solicitudes del mismo usuario con `SELECT ... FOR UPDATE` y la toma actualiza solo casos SIN_GESTIONAR. La escritura condicionada, dentro de la transacción, evita duplicados entre procesos. No utiliza mutex JavaScript.

La mutación volvió a demostrar la falla al retirar la condición de estado. La ejecución final demuestra las dos reglas aprobadas. La revisión por otro integrante permanece pendiente.

## Migración y operación

Se agregó `20261116060000_informes_y_archivos_certificados`: informe final, ruta de comprobante y motivo de rechazo. Se aplicó únicamente a `mdw_e2e` durante la validación. Para actualizar la base habitual:

```powershell
pnpm exec prisma migrate deploy
pnpm exec prisma generate
```

Los comprobantes habituales viven en `.data/certificados` o `CERTIFICATE_UPLOAD_DIR`; requieren persistencia y respaldo. Varias instancias necesitan almacenamiento compartido. Los certificados anteriores sin archivo se mantienen legibles, pero no permiten recuperar un comprobante que nunca se guardó.

Una suite verde certifica estos escenarios; no equivale a cobertura total de todas las historias ni acredita protección de rama o revisión externa.
