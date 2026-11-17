import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { account, cargarCertificado, datosCertificado, db, password, report, registerInBrowser, loginInBrowser, logoutInBrowser } from './helpers';

test.afterAll(async () => db.$disconnect());

test('H1/H2/H3/H8: coordinador inicia sesión, ve casos, aprueba y deniega personas distintas, edita voluntario y sale', async ({ page, browser, request }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 });
  const coordinator = await registerInBrowser(page);
  // Preparar la autoridad inicial en la base aislada; el registro público siempre crea voluntarios.
  await db.usuario.update({ where: { id: coordinator.id }, data: { rol: 'COORDINADOR' } });
  const caso = await report(request);
  const candidates = [];
  for (let index = 0; index < 2; index++) {
    const context = await browser.newContext();
    try {
      const candidatePage = await context.newPage();
      const user = await registerInBrowser(candidatePage);
      await loginInBrowser(candidatePage, user.email, '/ascensos');
      await candidatePage.getByRole('button', { name: 'Solicitar ascenso', exact: true }).click();
      await expect(candidatePage.getByRole('status')).toHaveText('Solicitud enviada. Te avisaremos cuando se resuelva.');
      candidates.push(user);
      await logoutInBrowser(candidatePage, user.nombreUsuario);
    } finally { await context.close(); }
  }
  await loginInBrowser(page, coordinator.email, '/casos');
  await expect(page.getByRole('link').filter({ hasText: caso.descripcion })).toBeVisible();
  for (const [index, user] of candidates.entries()) {
    await page.goto(`/usuarios/${user.id}/solicitudes`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: index === 0 ? 'Ascender a Coordinador' : 'Denegar ascenso', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText(index === 0 ? 'Ascenso aprobado. Se notificó a la persona.' : 'Ascenso denegado. Se notificó a la persona.');
    expect((await db.usuario.findUniqueOrThrow({ where: { id: user.id } })).rol).toBe(index === 0 ? 'COORDINADOR' : 'VOLUNTARIO');
    expect((await db.solicitudAscenso.findFirstOrThrow({ where: { usuarioId: user.id } })).estado).toBe(index === 0 ? 'APROBADO' : 'RECHAZADO');
  }
  const volunteer = candidates[1];
  await page.goto(`/usuarios/${volunteer.id}`);
  await page.getByRole('button', { name: 'Editar usuario', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByLabel('Nombre', { exact: true }).fill('Nombre actualizado');
  await page.getByLabel('Apellido', { exact: true }).fill('Apellido actualizado');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Usuario actualizado.');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Perfil de Nombre actualizado Apellido actualizado' })).toBeVisible();
  await logoutInBrowser(page, coordinator.nombreUsuario);
});
test('H7: la prioridad del reporte sale de las preguntas de estado', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  const reportar = async (responde: string | null, respira: string | null) => {
    await page.goto('/reportar');
    // No hay un selector de prioridad con un valor elegido de antemano.
    await expect(page.getByLabel('Prioridad de la emergencia')).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Prioridad' })).toContainText('Verde');
    if (responde) await page.getByRole('group', { name: '¿Responde si le hablás?' }).getByLabel(responde, { exact: true }).check();
    if (respira) await page.getByRole('group', { name: '¿Respira con normalidad?' }).getByLabel(respira, { exact: true }).check();
    await page.getByLabel('¿Qué está pasando?').fill(`Prioridad derivada ${randomUUID()}`);
    await page.getByLabel('Dirección del incidente').fill('Mariano Moreno 1810, Rosario, Santa Fe');
    return page;
  };
  const enviar = async () => {
    await page.getByRole('button', { name: 'Reportar emergencia', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Emergencia reportada' })).toBeVisible();
    const id = (await page.locator('.reporte-codigo').innerText()).replace('Código: ', '').trim();
    return (await db.emergencia.findUniqueOrThrow({ where: { id } })).prioridad;
  };

  await reportar('No', 'Sí');
  await expect(page.getByRole('status').filter({ hasText: 'Prioridad' })).toContainText('Rojo');
  // Con Rojo se repite cómo llamar a emergencias junto a la prioridad.
  await expect(page.getByRole('link', { name: 'Llamar al 107' })).toHaveCount(2);
  expect(await enviar()).toBe('ROJO');

  await reportar('Sí', 'No sé');
  await expect(page.getByRole('status').filter({ hasText: 'Prioridad' })).toContainText('Amarillo');
  await expect(page.getByRole('link', { name: 'Llamar al 107' })).toHaveCount(1);
  expect(await enviar()).toBe('AMARILLO');

  await reportar('Sí', 'Sí');
  expect(await enviar()).toBe('VERDE');
});

test('H1/H2/H3/H5/H7-H11: persona sin cuenta reporta; voluntario se registra, atiende, carga certificado, solicita ascenso y sale', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 375, height: 812 });
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
  expect(await page.request.get('/api/usuarios/me').then(r => r.status())).toBe(401);
  const user = await registerInBrowser(page);
  await loginInBrowser(page, user.email, '/casos');
  await page.getByRole('link').filter({ hasText: description }).click();
  await expect(page).toHaveURL(new RegExp(`/casos/${id}$`));
  await page.getByRole('button', { name: 'Tomar caso', exact: true }).click();
  await expect(page.getByLabel('Informe final')).toBeVisible();
  expect((await db.emergencia.findUniqueOrThrow({ where: { id } })).estado).toBe('EN_CAMINO');
  expect(await db.usuarioEmergencia.count({ where: { emergenciaId: id, usuarioId: user.id } })).toBe(1);
  await page.getByLabel('Informe final').fill('Se brindó asistencia y se resolvió la situación.');
  await page.getByRole('button', { name: 'Finalizar atención', exact: true }).click();
  await expect(page.getByText('Caso gestionado. Gracias por la ayuda.')).toBeVisible();
  expect((await db.emergencia.findUniqueOrThrow({ where: { id } })).estado).toBe('GESTIONADA');
  expect((await db.emergencia.findUniqueOrThrow({ where: { id } })).observacionesCierre).toBe('Se brindó asistencia y se resolvió la situación.');
  await page.goto('/casos');
  await expect(page.getByText(description, { exact: true })).toHaveCount(0);
  const codigo = `recorrido-${randomUUID()}`;
  await cargarCertificado(page, { nombre: 'Primeros auxilios', codigo });
  const certificado = await db.certificado.findFirstOrThrow({ where: { codigoVerificacion: codigo } });
  expect(certificado.usuarioId).toBe(user.id);
  expect(certificado.estado).toBe('PENDIENTE');
  await page.goto('/ascensos');
  await page.getByRole('button', { name: 'Solicitar ascenso', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Solicitud enviada. Te avisaremos cuando se resuelva.');
  expect(await db.solicitudAscenso.count({ where: { usuarioId: user.id, estado: 'PENDIENTE' } })).toBe(1);
  await page.getByRole('button', { name: `Opciones de cuenta (${user.nombreUsuario})` }).click();
  await page.getByRole('link', { name: 'Mi cuenta', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Perfil de/ })).toBeVisible();
  await page.getByRole('button', { name: 'Editar usuario' }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Editado');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText('Usuario actualizado.', { exact: true })).toBeVisible();
  await logoutInBrowser(page, user.nombreUsuario);
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
    expect(await request.post('/api/solicitudes-ascenso').then(r => r.status())).toBe(403);
  } finally { await coordinator.dispose(); }
});

test('H10: rojo exige certificado aprobado', async ({ request }) => {
  const user = await account(request);
  const caso = await report(request, 'ROJO');
  expect(await request.post(`/api/emergencias/${caso.id}/tomar`).then(r => r.status())).toBe(403);
  await db.certificado.create({ data: { usuarioId: user.id, usuarioCreacionId: user.id, codigoVerificacion: randomUUID(), estado: 'APROBADO',
    ...datosCertificado, fechaEmision: new Date('2026-01-15T12:00:00Z'), archivoTipo: 'application/pdf', archivoNombre: 'curso.pdf' } });
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
  await expect(link).toHaveAttribute('href', '/certificados/nuevo');
  const response = await page.goto('/certificados/nuevo');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1, name: 'Cargar certificado' })).toBeVisible();
  // La ruta anterior sigue funcionando: lleva a los certificados propios.
  await page.goto('/formacion');
  await expect(page).toHaveURL(/\/certificados$/);
});
