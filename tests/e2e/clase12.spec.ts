import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { account, db, password } from './helpers';

test.afterAll(async () => db.$disconnect());

test('avisos: marcar todos mediante Server Action desde teclado a 375 px', async ({ page }) => {
  const usuario = await account(page.request);
  await db.notificacion.create({ data: { usuarioId: usuario.id, tipo: 'VALIDACION_PENDIENTE', clave: `formulario-${randomUUID()}`, titulo: 'Aviso de prueba', cuerpo: 'Prueba del formulario de lectura.', enlace: '/cuenta' } });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/notificaciones');
  const boton = page.getByRole('button', { name: 'Marcar todo como leído', exact: true });
  await boton.focus(); await page.keyboard.press('Enter');
  await expect(boton).toHaveCount(0);
  expect(await db.notificacion.count({ where: { usuarioId: usuario.id, leidaEn: null } })).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('formularios: teclado, errores por campo, datos conservados y negocio arriba a 375 px', async ({ page, request }) => {
  const existente = await account(request);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/registro');
  await page.getByRole('button', { name: 'Registrarse', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Email', { exact: true })).toBeFocused();
  await expect(page.locator('#email-registro')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#registro-email-registro-error')).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(existente.email);
  await page.getByLabel('Nombre', { exact: true }).fill('Nombre conservado');
  await page.getByLabel('Apellido', { exact: true }).fill('Apellido conservado');
  await page.getByLabel('Fecha de nacimiento').fill('1990-01-01');
  await page.getByLabel('Nombre de usuario', { exact: true }).fill(`nuevo_${randomUUID()}`);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill('distinta123');
  await page.getByRole('button', { name: 'Registrarse', exact: true }).click();
  await expect(page.locator('#registro-confirmar-password-error')).toHaveText('Las contraseñas no coinciden.');
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue(password);
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Nombre conservado');
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(password);
  await page.route('**/registro', async route => {
    if (route.request().headers()['next-action']) await new Promise(resolve => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.getByRole('button', { name: 'Registrarse', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Registrarse', exact: true })).toBeDisabled();
  await expect(page.locator('.form-error')).toContainText('ya está registrado');
  await expect(page.locator('.form-error')).toBeFocused();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(existente.email);
  expect(await page.locator('#registro').evaluate(form => form.firstElementChild?.classList.contains('form-error'))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  await page.goto('/login');
  await page.getByLabel('Nombre de usuario o email').fill(existente.email);
  await page.getByLabel('Contraseña', { exact: true }).fill('incorrecta');
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page.locator('.form-error')).toContainText('incorrectos');
  await expect(page.getByLabel('Nombre de usuario o email')).toHaveValue(existente.email);
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveValue('incorrecta');

  await page.goto('/reportar');
  await page.getByRole('button', { name: 'Reportar emergencia', exact: true }).click();
  await expect(page.locator('#reporte-descripcion-error')).toBeVisible();
  await page.getByLabel('¿Qué está pasando?').fill(`Reporte teclado ${randomUUID()}`);
  await page.getByLabel('Dirección del incidente').fill('Moreno 1810, Rosario, Santa Fe');
  await page.getByLabel('Foto (opcional)', { exact: true }).setInputFiles({ name: 'invalido.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await expect(page.locator('#foto')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#foto-error')).toBeVisible();
  await page.getByLabel('Foto (opcional)', { exact: true }).setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64') });
  await page.getByRole('button', { name: 'Reportar emergencia', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Emergencia reportada' })).toBeVisible();
  await expect(page.getByText('Foto adjuntada.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('perfil valida cada campo y una sesión con rol revocado no modifica otro usuario', async ({ page, request }) => {
  const destino = await account(request);
  const coordinador = await account(page.request, 'COORDINADOR');
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`/usuarios/${destino.id}`);
  await page.getByRole('button', { name: 'Editar usuario', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Nombre conservado');
  await page.getByLabel('Fecha de nacimiento').fill('2999-01-01');
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.locator('#perfil-fechaNac-error')).toBeVisible();
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Nombre conservado');
  await page.getByLabel('Fecha de nacimiento').fill('1990-01-01');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('input[type=hidden][name*=id i]').count()).toBe(0);
  await db.usuario.update({ where: { id: coordinador.id }, data: { rol: 'VOLUNTARIO' } });
  await page.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await expect(page.locator('.form-error')).toHaveText('No tenés permiso para realizar esta operación.');
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Nombre conservado');
  expect((await db.usuario.findUniqueOrThrow({ where: { id: destino.id }, include: { persona: true } })).persona.nombre).toBe('Prueba');
});

test('certificado conserva archivo y datos ante validación', async ({ page }) => {
  const usuario = await account(page.request);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/certificados/nuevo');
  const codigo = `archivo-${randomUUID()}`;
  await page.getByLabel('Nombre del certificado').fill('Primeros auxilios');
  await page.getByLabel('Entidad emisora').fill('Cruz Roja Argentina');
  await page.getByLabel('Fecha de emisión').fill('2026-01-15');
  await page.getByLabel('Número de certificado').fill(codigo);
  await page.getByLabel('Archivo', { exact: true }).setInputFiles({ name: 'invalido.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await page.getByRole('button', { name: 'Cargar certificado' }).click();
  await expect(page.locator('#certificado-cert-archivo-error')).toHaveText('Elegí un PDF o una imagen JPG, PNG o WebP de hasta 5 MB.');
  await expect(page.getByLabel('Archivo', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Número de certificado')).toHaveValue(codigo);
  await expect(page.getByLabel('Nombre del certificado')).toHaveValue('Primeros auxilios');
  expect(await page.getByLabel('Archivo', { exact: true }).evaluate((input: HTMLInputElement) => input.files?.[0]?.name)).toBe('invalido.svg');
  await page.getByLabel('Archivo', { exact: true }).setInputFiles({ name: 'valido.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
  await page.getByRole('button', { name: 'Cargar certificado' }).click();
  await expect(page).toHaveURL(/\/certificados$/);
  expect((await db.certificado.findFirstOrThrow({ where: { codigoVerificacion: codigo } })).usuarioId).toBe(usuario.id);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
