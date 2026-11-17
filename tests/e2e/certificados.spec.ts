import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { account, cargarCertificado, datosCertificado, db, pdf, report } from './helpers';

test.afterAll(async () => db.$disconnect());

test('H5/H6: subir, rechazar con motivo, volver a cargar y aprobar desde navegador', async ({ page, browser, request }) => {
  const user = await account(page.request);
  const ctx = await browser.newContext();
  try {
    const reviewer = await account(ctx.request, 'COORDINADOR');
    const coordinator = await ctx.newPage();
    const codigo = `rechazar-${randomUUID()}`;
    const nombre = `RCP ${randomUUID()}`;
    await cargarCertificado(page, { nombre, codigo });
    let certificado = await db.certificado.findFirstOrThrow({ where: { codigoVerificacion: codigo } });
    expect(certificado.usuarioId).toBe(user.id);
    expect(certificado.cursoId).toBeNull();
    expect(certificado.estado).toBe('PENDIENTE');
    const file = await page.request.get(`/api/certificados/${certificado.id}/archivo`);
    expect(file.status()).toBe(200);
    expect(await file.body()).toEqual(pdf);
    await coordinator.goto('/certificados/revisar');
    const row = coordinator.getByRole('article', { name: `Certificado ${nombre} de ${user.nombreUsuario}`, exact: true });
    // No hay una decisión preseleccionada ni un motivo a la vista hasta elegir.
    await expect(row.getByLabel('Resultado')).toHaveCount(0);
    await expect(row.getByLabel('Motivo del rechazo')).toHaveCount(0);
    // Cancelar vuelve a las dos opciones sin guardar nada.
    await row.getByRole('button', { name: 'Aprobar', exact: true }).click();
    await expect(row.getByText('podrá tomar casos rojos')).toBeVisible();
    await row.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Confirmar aprobación' })).toHaveCount(0);
    expect((await db.certificado.findUniqueOrThrow({ where: { id: certificado.id } })).estado).toBe('PENDIENTE');
    await row.getByRole('button', { name: 'Rechazar', exact: true }).click();
    await row.getByRole('button', { name: 'Confirmar rechazo' }).click();
    await expect(row.getByRole('alert')).toHaveText('Para rechazar, escribí el motivo (hasta 2000 caracteres).');
    await expect(row.getByLabel('Motivo del rechazo')).toBeFocused();
    await row.getByLabel('Motivo del rechazo').fill('El comprobante está incompleto.');
    await row.getByRole('button', { name: 'Confirmar rechazo' }).click();
    await expect(coordinator.getByRole('status')).toHaveText('Validación guardada.');
    certificado = await db.certificado.findUniqueOrThrow({ where: { id: certificado.id } });
    expect(certificado.usuarioRevisionId).toBe(reviewer.id);
    expect(certificado.fechaRevision).not.toBeNull();
    await page.goto('/certificados');
    await expect(page.getByText('Motivo del rechazo: El comprobante está incompleto.')).toBeVisible();
    expect(await ctx.request.patch(`/api/solicitudes-certificados/${certificado.id}`, { data: { estado: 'APROBADO' } }).then(r => r.status())).toBe(409);
    const nuevo = `aprobar-${randomUUID()}`;
    const nombreNuevo = `RCP ${randomUUID()}`;
    await cargarCertificado(page, { nombre: nombreNuevo, codigo: nuevo });
    certificado = await db.certificado.findFirstOrThrow({ where: { codigoVerificacion: nuevo } });
    const caso = await report(request, 'ROJO');
    expect(await page.request.post(`/api/emergencias/${caso.id}/tomar`).then(r => r.status())).toBe(403);
    await coordinator.reload();
    const filaNueva = coordinator.getByRole('article', { name: `Certificado ${nombreNuevo} de ${user.nombreUsuario}`, exact: true });
    await filaNueva.getByRole('button', { name: 'Aprobar', exact: true }).click();
    await filaNueva.getByRole('button', { name: 'Confirmar aprobación' }).click();
    await expect(coordinator.getByRole('status')).toHaveText('Validación guardada.');
    expect((await db.certificado.findUniqueOrThrow({ where: { id: certificado.id } })).estado).toBe('APROBADO');
    expect(await page.request.post(`/api/emergencias/${caso.id}/tomar`).then(r => r.status())).toBe(200);
    expect(await db.notificacion.count({ where: { usuarioId: user.id, clave: { startsWith: 'certificado_resuelto:' } } })).toBe(2);
    await expect.poll(() => db.notificacion.count({ where: { usuarioId: reviewer.id, clave: `certificado:${certificado.id}` } })).toBe(1);
  } finally { await ctx.close(); }
});

test('H5/H6: archivos privados, rechazo de archivos inválidos y permisos vigentes', async ({ request, playwright }) => {
  const user = await account(request);
  const other = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3100' });
  const coordinator = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3100' });
  try {
    await account(other);
    const actor = await account(coordinator, 'COORDINADOR');
    const campos = { ...datosCertificado, codigoVerificacion: randomUUID() };
    const invalid = await request.post('/api/certificados', { multipart: { ...campos, archivo: { name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') } } });
    expect(invalid.status()).toBe(400);
    expect(await request.post('/api/certificados', { multipart: { ...campos, archivo: { name: 'exceso.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(6 * 1024 * 1024) } } }).then(r => r.status())).toBe(413);
    const curso = await request.post('/api/certificados', { multipart: { ...campos, cursoId: randomUUID(), archivo: { name: 'curso.pdf', mimeType: 'application/pdf', buffer: pdf } } });
    expect(curso.status()).toBe(404);
    expect((await curso.json()).codigo).toBe('CURSO_NO_ENCONTRADO');
    const res = await request.post('/api/certificados', { multipart: { ...campos, usuarioId: actor.id, estado: 'APROBADO', archivo: { name: 'curso.pdf', mimeType: 'application/pdf', buffer: pdf } } });
    expect(res.status()).toBe(201);
    const cert = await res.json();
    expect(cert.usuarioId).toBe(user.id); expect(cert.estado).toBe('PENDIENTE');
    const archivo = `/api/certificados/${cert.id}/archivo`;
    expect(await other.get(archivo).then(r => r.status())).toBe(404);
    expect(await coordinator.get(archivo).then(r => r.status())).toBe(200);
    expect(await other.patch(`/api/certificados/${cert.id}`, { data: { estado: 'APROBADO' } }).then(r => r.status())).toBe(403);
    expect(await coordinator.put(`/api/certificados/${cert.id}`, { data: { estado: 'APROBADO' } }).then(r => r.status())).toBe(400);
    await db.usuario.update({ where: { id: actor.id }, data: { rol: 'VOLUNTARIO' } });
    expect(await coordinator.patch(`/api/solicitudes-certificados/${cert.id}`, { data: { estado: 'APROBADO' } }).then(r => r.status())).toBe(403);
    expect(await coordinator.patch(`/api/certificados/${cert.id}`, { data: { estado: 'APROBADO' } }).then(r => r.status())).toBe(403);
    expect(await coordinator.get(archivo).then(r => r.status())).toBe(404);
    expect((await db.certificado.findUniqueOrThrow({ where: { id: cert.id } })).estado).toBe('PENDIENTE');
  } finally { await other.dispose(); await coordinator.dispose(); }
});

test('H4/H5: coordinación crea un curso que otorga certificado y la persona solo sube el archivo', async ({ page, browser }) => {
  const user = await account(page.request);
  const ctx = await browser.newContext();
  try {
    await account(ctx.request, 'COORDINADOR');
    const coordinator = await ctx.newPage();
    const titulo = `Primeros auxilios ${randomUUID()}`;
    await coordinator.goto('/cursos/nuevo');
    await coordinator.getByLabel('Título').fill(titulo);
    await coordinator.getByLabel('Descripción').fill('Curso presencial de primeros auxilios.');
    await coordinator.getByLabel('Fecha de inicio').fill('2026-01-05');
    await coordinator.getByLabel('Fecha de fin').fill('2026-02-01');
    await coordinator.getByLabel('Horas').fill('20');
    await coordinator.getByLabel('Al terminar, el curso otorga un certificado').check();
    await coordinator.getByRole('button', { name: 'Crear curso' }).click();
    await expect(coordinator.locator('#curso-curso-cert-nombre-error')).toHaveText('Para que el curso otorgue un certificado, completá su nombre y la entidad emisora.');
    await expect(coordinator.getByLabel('Nombre del certificado')).toBeFocused();
    await coordinator.getByLabel('Nombre del certificado').fill('Certificado de Primeros Auxilios');
    await coordinator.getByLabel('Entidad emisora del certificado').fill('Cruz Roja Argentina');
    await coordinator.getByRole('button', { name: 'Crear curso' }).click();
    await expect(coordinator).toHaveURL(/\/cursos$/);
    const curso = await db.cursos.findFirstOrThrow({ where: { titulo } });
    expect(curso.horas).toBe(20);
    expect(curso.certificadoNombre).toBe('Certificado de Primeros Auxilios');

    await page.goto('/cursos');
    const tarjeta = page.getByRole('article', { name: `Curso ${titulo}`, exact: true });
    await expect(tarjeta.getByRole('link', { name: /Editar/ })).toHaveCount(0);
    await expect(tarjeta.getByRole('button', { name: /Dar de baja/ })).toHaveCount(0);
    await tarjeta.getByRole('link', { name: `Cargar mi certificado de ${titulo}` }).click();
    await expect(page).toHaveURL(new RegExp(`/certificados/nuevo\\?cursoId=${curso.id}$`));
    await expect(page.getByText('Certificado de Primeros Auxilios', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Nombre del certificado')).toHaveCount(0);
    await page.getByLabel('Archivo', { exact: true }).setInputFiles({ name: 'curso.pdf', mimeType: 'application/pdf', buffer: pdf });
    await page.getByRole('button', { name: 'Cargar certificado' }).click();
    await expect(page).toHaveURL(/\/certificados$/);
    const certificado = await db.certificado.findFirstOrThrow({ where: { usuarioId: user.id, cursoId: curso.id } });
    expect(certificado).toMatchObject({ nombre: 'Certificado de Primeros Auxilios', entidadEmisora: 'Cruz Roja Argentina', estado: 'PENDIENTE' });
    expect(certificado.fechaEmision.toISOString()).toBe('2026-02-01T12:00:00.000Z');

    // Un segundo certificado activo del mismo curso se rechaza; editar el curso no cambia el ya cargado.
    const duplicado = await page.request.post('/api/certificados', { multipart: { cursoId: curso.id, archivo: { name: 'curso.pdf', mimeType: 'application/pdf', buffer: pdf } } });
    expect(duplicado.status()).toBe(409);
    expect((await duplicado.json()).codigo).toBe('CERTIFICADO_DUPLICADO');
    expect(await ctx.request.patch(`/api/cursos/${curso.id}`, { data: { certificadoNombre: 'Otro nombre' } }).then(r => r.status())).toBe(200);
    expect((await db.certificado.findUniqueOrThrow({ where: { id: certificado.id } })).nombre).toBe('Certificado de Primeros Auxilios');
    await page.goto('/cursos');
    await expect(tarjeta.getByText('Ya cargaste tu certificado de este curso.')).toBeVisible();

    // Un curso que todavía no terminó no permite cargar su certificado.
    const futuro = await ctx.request.post('/api/cursos', { data: { titulo: `Futuro ${randomUUID()}`, descripcion: 'Más adelante', fechaDesde: '2026-01-01', fechaHasta: '2099-01-01', certificadoNombre: 'X', certificadoEmisor: 'Y' } });
    expect(futuro.status()).toBe(201);
    const enCurso = await page.request.post('/api/certificados', { multipart: { cursoId: (await futuro.json()).id, archivo: { name: 'curso.pdf', mimeType: 'application/pdf', buffer: pdf } } });
    expect(enCurso.status()).toBe(400);
    expect((await enCurso.json()).codigo).toBe('CURSO_NO_FINALIZADO');

    // La baja del curso la decide coordinación y no toca los certificados.
    coordinator.on('dialog', d => d.accept());
    await coordinator.goto('/cursos');
    await coordinator.getByRole('article', { name: `Curso ${titulo}`, exact: true }).getByRole('button', { name: `Dar de baja ${titulo}` }).click();
    await expect(coordinator.getByRole('article', { name: `Curso ${titulo}`, exact: true })).toHaveCount(0);
    expect((await db.certificado.findUniqueOrThrow({ where: { id: certificado.id } })).fechaEliminacion).toBeNull();
  } finally { await ctx.close(); }
});

test('H6: un rechazado corregido vuelve a revisión y se aprueba; nadie revisa su propio certificado', async ({ page, browser }) => {
  const user = await account(page.request);
  const ctx = await browser.newContext();
  try {
    const reviewer = await account(ctx.request, 'COORDINADOR');
    const coordinator = await ctx.newPage();
    const nombre = `Reenvío ${randomUUID()}`;
    await cargarCertificado(page, { nombre, codigo: `r-${randomUUID()}` });
    const certificado = await db.certificado.findFirstOrThrow({ where: { usuarioId: user.id, nombre } });
    expect(await ctx.request.patch(`/api/certificados/${certificado.id}`, { data: { estado: 'RECHAZADO', motivo: 'Falta la firma.' } }).then(r => r.status())).toBe(200);

    // La persona corrige el rechazado: vuelve a PENDIENTE y coordinación recibe un aviso nuevo.
    await page.goto(`/certificados/${certificado.id}/editar`);
    await expect(page.getByText('Al guardar, el certificado vuelve a revisión.')).toBeVisible();
    await page.getByLabel('Reemplazar archivo').setInputFiles({ name: 'firmado.pdf', mimeType: 'application/pdf', buffer: pdf });
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page).toHaveURL(/\/certificados$/);
    expect((await db.certificado.findUniqueOrThrow({ where: { id: certificado.id } })).estado).toBe('PENDIENTE');
    await expect.poll(() => db.notificacion.count({ where: { usuarioId: reviewer.id, clave: { startsWith: `certificado:${certificado.id}:reenvio:` } } })).toBe(1);

    // Se puede revisar otra vez: el aviso a la persona no choca con el del rechazo.
    await coordinator.goto('/certificados/revisar');
    const corregido = coordinator.getByRole('article', { name: `Certificado ${nombre} de ${user.nombreUsuario}`, exact: true });
    await corregido.getByRole('button', { name: 'Aprobar', exact: true }).click();
    await corregido.getByRole('button', { name: 'Confirmar aprobación' }).click();
    await expect(coordinator.getByRole('status')).toHaveText('Validación guardada.');
    expect((await db.certificado.findUniqueOrThrow({ where: { id: certificado.id } })).estado).toBe('APROBADO');
    expect(await db.notificacion.count({ where: { usuarioId: user.id, clave: { startsWith: `certificado_resuelto:${certificado.id}:` } } })).toBe(2);

    // El certificado propio aparece sin formulario y la API lo rechaza.
    const propio = `Propio ${randomUUID()}`;
    await cargarCertificado(coordinator, { nombre: propio, codigo: `p-${randomUUID()}` });
    const suyo = await db.certificado.findFirstOrThrow({ where: { usuarioId: reviewer.id, nombre: propio } });
    await coordinator.goto('/certificados/revisar');
    const tarjeta = coordinator.getByRole('article', { name: `Certificado ${propio} de ${reviewer.nombreUsuario}`, exact: true });
    await expect(tarjeta.getByText('Es tu certificado: lo revisa otra persona de coordinación.')).toBeVisible();
    await expect(tarjeta.getByRole('button', { name: 'Aprobar', exact: true })).toHaveCount(0);
    await expect(tarjeta.getByRole('button', { name: 'Rechazar', exact: true })).toHaveCount(0);
    const intento = await ctx.request.patch(`/api/certificados/${suyo.id}`, { data: { estado: 'APROBADO' } });
    expect(intento.status()).toBe(403);
    expect((await intento.json()).codigo).toBe('CERTIFICADO_PROPIO');
    expect(await ctx.request.patch(`/api/solicitudes-certificados/${suyo.id}`, { data: { estado: 'APROBADO' } }).then(r => r.status())).toBe(403);
    expect((await db.certificado.findUniqueOrThrow({ where: { id: suyo.id } })).estado).toBe('PENDIENTE');
  } finally { await ctx.close(); }
});
