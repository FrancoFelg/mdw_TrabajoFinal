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
    await row.getByLabel('Resultado').selectOption('RECHAZADO');
    await row.getByRole('button', { name: 'Guardar validación' }).click();
    await expect(coordinator.getByRole('status')).toHaveText('Para rechazar, escribí el motivo (hasta 2000 caracteres).');
    await row.getByLabel('Motivo del rechazo').fill('El comprobante está incompleto.');
    await row.getByRole('button', { name: 'Guardar validación' }).click();
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
    await coordinator.getByRole('article', { name: `Certificado ${nombreNuevo} de ${user.nombreUsuario}`, exact: true }).getByRole('button', { name: 'Guardar validación' }).click();
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
    // La vinculación con cursos llega en la parte 2: hoy se rechaza en lugar de ignorarse.
    const curso = await request.post('/api/certificados', { multipart: { ...campos, cursoId: randomUUID(), archivo: { name: 'curso.pdf', mimeType: 'application/pdf', buffer: pdf } } });
    expect(curso.status()).toBe(400);
    expect((await curso.json()).codigo).toBe('CURSO_NO_DISPONIBLE');
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
