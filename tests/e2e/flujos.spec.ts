import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { account, db, password, report } from './helpers';

test.afterAll(async () => db.$disconnect());
test('H2/H7-H11: reporte público, login, tomar y finalizar desde navegador', async ({ page, request }) => {
  const user = await account(request);
  const description = `Persona necesita asistencia E2E ${randomUUID()}`;
  await page.goto('/reportar');
  await page.getByLabel('¿Qué está pasando?').fill(description);
  await page.getByLabel('Dirección del incidente').fill('Mariano Moreno 1810, Rosario, Santa Fe');
  await page.getByRole('button', { name: 'Reportar emergencia', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Emergencia reportada' })).toBeVisible();
  const code = await page.locator('.reporte-codigo').innerText();
  const id = code.replace('Código: ', '').trim();
  const caso = await db.emergencia.findUniqueOrThrow({ where: { id }, include: { ubicacion: true } });
  expect(caso.estado).toBe('SIN_GESTIONAR');
  expect(caso.prioridad).toBe('VERDE');
  expect(caso.ubicacion.direccion).toContain('Mariano Moreno 1810');
  expect(caso.ubicacion.coordenada_x).toBeNull();
  await page.goto(`/login?next=/casos/${id}`);
  await page.getByLabel('Nombre de usuario o email').fill(user.email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/casos/${id}$`));
  await page.getByRole('button', { name: 'Tomar caso', exact: true }).click();
  await expect(page.getByLabel('Informe final')).toBeVisible();
  await page.getByLabel('Informe final').fill('Se brindó asistencia y se resolvió la situación.');
  await page.getByRole('button', { name: 'Finalizar atención', exact: true }).click();
  await expect(page.getByText('Caso gestionado. Gracias por la ayuda.')).toBeVisible();
  expect((await db.emergencia.findUniqueOrThrow({ where: { id } })).estado).toBe('GESTIONADA');
  expect((await db.emergencia.findUniqueOrThrow({ where: { id } })).observacionesCierre).toBe('Se brindó asistencia y se resolvió la situación.');
  await page.goto('/casos');
  await expect(page.getByText(description, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: `Opciones de cuenta (${user.nombreUsuario})` }).click();
  await page.getByRole('link', { name: 'Mi cuenta', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Perfil de/ })).toBeVisible();
  await page.getByRole('button', { name: 'Editar usuario' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Editado');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Usuario actualizado.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: `Opciones de cuenta (${user.nombreUsuario})` }).click();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3100/');
  await expect(page.getByRole('link', { name: 'Soy voluntario' })).toBeVisible();
});

test('H1/H2: perfil propio, login por nombre/email, duplicidad y privacidad', async ({ request }) => {
  const user = await account(request);
  const me = await request.get('/api/usuarios/me');
  expect(me.status()).toBe(200);
  expect(await me.text()).not.toMatch(/password|\$2[aby]\$/i);
  const edit = await request.patch('/api/usuarios/me', { data: { nombreUsuario: user.nombreUsuario, email: user.email, persona: { nombre: 'Editado', apellido: 'Local', fechaNac: '1990-01-01', telefonos: [] } } });
  expect(edit.status()).toBe(200);
  expect(await request.patch('/api/usuarios/me', { data: { rol: 'ADMIN' } }).then(r => r.status())).toBe(400);
  expect(await request.post('/api/auth/login', { data: { email: user.email, password } }).then(r => r.status())).toBe(200);
  expect(await request.post('/api/auth/login', { data: { email: user.email, password: 'incorrecta' } }).then(r => r.status())).toBe(401);
  expect(await request.post('/api/usuarios', { data: { nombreUsuario: user.nombreUsuario, email: user.email, password, persona: { nombre: 'Otro', apellido: 'Local', fechaNac: '1990-01-01' } } }).then(r => r.status())).toBe(409);
});

test('H3: solicitud, duplicado, rechazo, historial y aprobación con avisos', async ({ request, playwright }) => {
  const user = await account(request);
  const coordinator = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3100' });
  try {
    await account(coordinator, 'COORDINADOR');
    const first = await request.post('/api/solicitudes-ascenso');
    expect(first.status()).toBe(201);
    const pending = await first.json();
    expect(await request.post('/api/solicitudes-ascenso').then(r => r.status())).toBe(409);
    expect(await coordinator.post(`/api/solicitudes-ascenso/${pending.id}/rechazar`).then(r => r.status())).toBe(200);
    const second = await request.post('/api/solicitudes-ascenso');
    expect(second.status()).toBe(201);
    const next = await second.json();
    expect(await coordinator.post(`/api/solicitudes-ascenso/${next.id}/aprobar`).then(r => r.status())).toBe(200);
    expect((await db.usuario.findUniqueOrThrow({ where: { id: user.id } })).rol).toBe('COORDINADOR');
    const history = await db.solicitudAscenso.findMany({ where: { usuarioId: user.id } });
    expect(history.map(row => row.estado).sort()).toEqual(['APROBADO', 'RECHAZADO']);
    expect(await db.notificacion.count({ where: { usuarioId: user.id } })).toBeGreaterThanOrEqual(5);
    expect(await request.post('/api/solicitudes-ascenso').then(r => r.status())).toBe(403);
  } finally { await coordinator.dispose(); }
});

test('H10: rojo exige certificado aprobado', async ({ request }) => {
  const user = await account(request);
  const caso = await report(request, 'ROJO');
  expect(await request.post(`/api/emergencias/${caso.id}/tomar`).then(r => r.status())).toBe(403);
  await db.certificado.create({ data: { usuarioId: user.id, usuarioCreacionId: user.id, codigoVerificacion: randomUUID(), estado: 'APROBADO' } });
  expect(await request.post(`/api/emergencias/${caso.id}/tomar`).then(r => r.status())).toBe(200);
});

test('H8/H9: mapa con marcadores por prioridad y filtro de casos libres', async ({ page, request, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: -34.60, longitude: -58.38 });
  await account(page.request);
  const rojo = await report(request, 'ROJO');
  const verde = await report(request, 'VERDE');
  await page.goto('/casos');
  const redMarker = page.locator(`[title="Caso #${rojo.id.slice(-4).toUpperCase()}, prioridad Rojo"]`);
  const greenMarker = page.locator(`[title="Caso #${verde.id.slice(-4).toUpperCase()}, prioridad Verde"]`);
  await expect(redMarker).toBeAttached();
  await expect(greenMarker).toBeAttached();
  await expect(redMarker.locator('.pin-rojo')).toHaveCount(1);
  await expect(greenMarker.locator('.pin-verde')).toHaveCount(1);
  await page.getByRole('button', { name: /^Rojo/ }).click();
  await expect(redMarker).toBeAttached();
  await expect(greenMarker).toHaveCount(0);
});

test('H7: reporte anónimo con GPS, prioridades, idempotencia y foto', async ({ request }) => {
  for (const priority of ['VERDE', 'AMARILLO', 'ROJO']) {
    const key = randomUUID();
    const data = { descripcion: `Asistencia GPS ${priority}`, prioridad: priority, coordenada_x: -58.38, coordenada_y: -34.60, provincia: 'CABA' };
    const first = await request.post('/api/emergencias', { headers: { 'Idempotency-Key': key }, data });
    expect(first.status()).toBe(201);
    const caso = await first.json();
    expect(caso.prioridad).toBe(priority);
    const retry = await request.post('/api/emergencias', { headers: { 'Idempotency-Key': key }, data });
    expect(retry.status()).toBe(200);
    expect((await retry.json()).id).toBe(caso.id);
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a4X8AAAAASUVORK5CYII=', 'base64');
    const photo = await request.post(`/api/emergencias/${caso.id}/foto`, { headers: { 'Content-Type': 'image/png', 'x-permiso-foto': caso.permisoFoto }, data: png });
    expect(photo.status()).toBe(200);
    expect((await db.emergencia.findUniqueOrThrow({ where: { id: caso.id } })).imagen).toBeTruthy();
  }
});

test('H1/H3: coordinador consulta perfil, cambia rol y no ve Mis ascensos', async ({ page, request }) => {
  const volunteer = await account(request);
  await account(page.request, 'COORDINADOR');
  await page.goto(`/usuarios/${volunteer.id}`);
  await expect(page.getByRole('link', { name: 'Mis ascensos', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Editar usuario' }).click();
  await page.getByLabel('Rol', { exact: true }).selectOption('COORDINADOR');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Usuario actualizado.', { exact: true })).toBeVisible();
  expect((await db.usuario.findUniqueOrThrow({ where: { id: volunteer.id } })).rol).toBe('COORDINADOR');
  await page.goto('/ascensos');
  await expect(page).toHaveURL('http://127.0.0.1:3100/usuarios');
});

test('H11: finalizar exige asignado; POST y PUT guardan el informe', async ({ request, playwright }) => {
  await account(request);
  const caso = await report(request);
  expect(await request.post(`/api/emergencias/${caso.id}/tomar`).then(r => r.status())).toBe(200);
  const other = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3100' });
  try {
    await account(other);
    expect(await other.put(`/api/emergencias/${caso.id}/finalizar`).then(r => r.status())).toBe(403);
    expect(await request.get('/api/emergencias/e2e-inexistente').then(r => r.status())).toBe(404);
    expect(await request.post(`/api/emergencias/${caso.id}/finalizar`, { data: { observaciones: 'corto' } }).then(r => r.status())).toBe(400);
    expect(await request.post(`/api/emergencias/${caso.id}/finalizar`, { data: { observaciones: 'Asistencia finalizada correctamente.' } }).then(r => r.status())).toBe(200);
    expect((await db.emergencia.findUniqueOrThrow({ where: { id: caso.id } })).observacionesCierre).toBe('Asistencia finalizada correctamente.');
    expect(await request.post(`/api/emergencias/${caso.id}/finalizar`, { data: { observaciones: 'No reemplazar el informe anterior.' } }).then(r => r.status())).toBe(409);
    expect((await db.emergencia.findUniqueOrThrow({ where: { id: caso.id } })).observacionesCierre).toBe('Asistencia finalizada correctamente.');
    const segundo = await report(request);
    expect(await request.post(`/api/emergencias/${segundo.id}/tomar`).then(r => r.status())).toBe(200);
    expect(await request.put(`/api/emergencias/${segundo.id}/finalizar`, { data: { observaciones: 'Informe por compatibilidad PUT.' } }).then(r => r.status())).toBe(200);
    expect((await db.emergencia.findUniqueOrThrow({ where: { id: segundo.id } })).observacionesCierre).toBe('Informe por compatibilidad PUT.');
  } finally { await other.dispose(); }
});

test('H5/H6: acceso a formación desde el bloqueo de un caso rojo', async ({ page, request }) => {
  await account(page.request);
  const caso = await report(request, 'ROJO');
  await page.goto(`/casos/${caso.id}`);
  const link = page.getByRole('link', { name: 'Cargar un certificado' });
  await expect(link).toHaveAttribute('href', '/formacion');
  const response = await page.goto('/formacion');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Formación y certificados' })).toBeVisible();
});
