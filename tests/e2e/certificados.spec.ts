import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { account, db, report } from './helpers';

const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');
test.afterAll(async () => db.$disconnect());

test('H5/H6: subir, rechazar con motivo, volver a cargar y aprobar desde navegador', async ({ page, browser, request }) => {
  const user = await account(page.request);
  const ctx = await browser.newContext();
  try {
    const reviewer = await account(ctx.request, 'COORDINADOR');
    const coordinator = await ctx.newPage();
    const curso = await ctx.request.post('/api/cursos', { data: { titulo: `RCP ${randomUUID()}`, descripcion: 'Primeros auxilios', fechaDesde: '2026-01-01', fechaHasta: '2026-02-01' } });
    expect(curso.status()).toBe(201);
    const cursoCreado = await curso.json();
    await page.goto('/formacion');
    const codigo = `rechazar-${randomUUID()}`;
    await page.getByLabel('Código de verificación').fill(codigo);
    await page.getByLabel('Archivo del certificado').setInputFiles({ name: 'curso.pdf', mimeType: 'application/pdf', buffer: pdf });
    await page.getByRole('button', { name: 'Enviar certificado' }).click();
    await expect(page.getByRole('status')).toHaveText('Certificado enviado a revisión.');
    let certificado = await db.certificado.findUniqueOrThrow({ where: { codigoVerificacion: codigo } });
    expect(certificado.usuarioId).toBe(user.id);
    expect(certificado.cursoId).toBeNull();
    expect(certificado.estado).toBe('PENDIENTE');
    const file = await page.request.get(certificado.archivo!);
    expect(file.status()).toBe(200);
    expect(await file.body()).toEqual(pdf);
    await coordinator.goto('/formacion');
    const row = coordinator.getByRole('article', { name: `Certificado ${codigo}`, exact: true });
    await row.getByLabel('Resultado').selectOption('RECHAZADO');
    await row.getByRole('button', { name: 'Guardar validación' }).click();
    await expect(row.getByRole('alert')).toHaveText('Ingresá el motivo del rechazo (hasta 2000 caracteres).');
    await row.getByLabel('Motivo del rechazo').fill('El comprobante está incompleto.');
    await row.getByRole('button', { name: 'Guardar validación' }).click();
    await expect(coordinator.getByRole('status')).toHaveText('Validación guardada.');
    await page.reload();
    await expect(page.getByText('Motivo: El comprobante está incompleto.')).toBeVisible();
    expect(await ctx.request.patch(`/api/solicitudes-certificados/${certificado.id}`, { data: { estado: 'APROBADO' } }).then(r => r.status())).toBe(409);
    const nuevo = `aprobar-${randomUUID()}`;
    await page.getByLabel('Código de verificación').fill(nuevo);
    await page.getByLabel('Curso (opcional)').selectOption(cursoCreado.id);
    await page.getByLabel('Archivo del certificado').setInputFiles({ name: 'curso.pdf', mimeType: 'application/pdf', buffer: pdf });
    await page.getByRole('button', { name: 'Enviar certificado' }).click();
    await expect(page.getByRole('status')).toHaveText('Certificado enviado a revisión.');
    certificado = await db.certificado.findUniqueOrThrow({ where: { codigoVerificacion: nuevo } });
    expect(certificado.cursoId).toBe(cursoCreado.id);
    const caso = await report(request, 'ROJO');
    expect(await page.request.post(`/api/emergencias/${caso.id}/tomar`).then(r => r.status())).toBe(403);
    await coordinator.reload();
    await coordinator.getByRole('article', { name: `Certificado ${nuevo}`, exact: true }).getByRole('button', { name: 'Guardar validación' }).click();
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
    const invalid = await request.post('/api/certificados', { multipart: { codigoVerificacion: randomUUID(), archivo: { name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') } } });
    expect(invalid.status()).toBe(400);
    expect(await request.post('/api/certificados', { multipart: { codigoVerificacion: randomUUID(), archivo: { name: 'exceso.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(6 * 1024 * 1024) } } }).then(r => r.status())).toBe(413);
    const codigo = randomUUID();
    const upload = () => request.post('/api/certificados', { multipart: { codigoVerificacion: codigo, usuarioId: actor.id, estado: 'APROBADO', archivo: { name: 'curso.pdf', mimeType: 'application/pdf', buffer: pdf } } });
    const res = await upload(); expect(res.status()).toBe(201);
    const cert = await res.json();
    expect(cert.usuarioId).toBe(user.id); expect(cert.estado).toBe('PENDIENTE');
    expect(await upload().then(r => r.status())).toBe(409);
    expect(await other.get(cert.archivo).then(r => r.status())).toBe(404);
    expect(await coordinator.get(cert.archivo).then(r => r.status())).toBe(200);
    expect(await other.patch(`/api/certificados/${cert.id}`, { data: { estado: 'APROBADO' } }).then(r => r.status())).toBe(403);
    expect(await coordinator.put(`/api/certificados/${cert.id}`, { data: { estado: 'APROBADO' } }).then(r => r.status())).toBe(400);
    await db.usuario.update({ where: { id: actor.id }, data: { rol: 'VOLUNTARIO' } });
    expect(await coordinator.patch(`/api/solicitudes-certificados/${cert.id}`, { data: { estado: 'APROBADO' } }).then(r => r.status())).toBe(403);
    expect(await coordinator.get(cert.archivo).then(r => r.status())).toBe(404);
    expect(await db.certificado.count({ where: { codigoVerificacion: codigo } })).toBe(1);
  } finally { await other.dispose(); await coordinator.dispose(); }
});
