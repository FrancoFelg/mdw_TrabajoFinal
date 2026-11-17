import { test, expect } from '@playwright/test';
import { account, db, loginInBrowser, logoutInBrowser } from './helpers';

test.afterAll(async () => db.$disconnect());

test('Clase 10: rutas públicas, sistema privado y navegación con identidad vigente', async ({ page }) => {
  for (const ruta of ['/', '/reportar', '/registro', '/login']) {
    expect((await page.goto(ruta))?.status()).toBe(200);
    await expect(page.getByRole('navigation', { name: 'Navegación principal' })).toHaveCount(0);
  }
  await page.goto('/sistema');
  await expect(page).toHaveURL(/\/login\?next=%2Fsistema$/);
  await expect(page.getByRole('heading', { name: 'Sistema visual', exact: true })).toHaveCount(0);

  const usuario = await account(page.request);
  await page.context().clearCookies();
  await loginInBrowser(page, usuario.email, '/sistema');
  await expect(page.getByRole('heading', { name: 'Sistema visual', exact: true })).toBeVisible();
  const identidad = page.locator('.marco-identidad');
  await expect(identidad.getByText(usuario.nombreUsuario, { exact: true })).toBeVisible();
  await expect(identidad.getByText('Voluntario', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Usuarios', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Red de Apoyo', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3100/');
  await expect(identidad.getByText(usuario.nombreUsuario, { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Casos', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3100/casos');

  await db.usuario.update({ where: { id: usuario.id }, data: { rol: 'COORDINADOR' } });
  await page.reload();
  await expect(identidad.getByText('Coordinador', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Usuarios', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(identidad.getByText(usuario.nombreUsuario, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await logoutInBrowser(page, usuario.nombreUsuario);
  await page.goto('/sistema');
  await expect(page).toHaveURL(/\/login\?next=%2Fsistema$/);
});
