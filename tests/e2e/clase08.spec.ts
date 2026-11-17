import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { account, db, report } from './helpers';

test.afterAll(async () => db.$disconnect());

test('Clase 08: sesión, casos compartidos, registros propios y 404 de registros ajenos', async ({ page, request, playwright }) => {
  const caso = await report(request);
  await page.goto(`/casos/${caso.id}`);
  await expect(page).toHaveURL(new RegExp(`/login\\?next=${encodeURIComponent(`/casos/${caso.id}`)}$`));
  const owner = await account(page.request);
  await page.goto(`/casos/${caso.id}`);
  await expect(page.getByRole('heading', { name: caso.descripcion, exact: true })).toBeVisible();
  expect((await page.request.post(`/api/emergencias/${caso.id}/tomar`)).status()).toBe(200);

  const other = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:3100' });
  try {
    await account(other);
    // La asistencia en curso sigue visible para evitar superposición de recursos.
    expect((await other.get(`/api/emergencias/${caso.id}`)).status()).toBe(200);
    expect((await page.request.post(`/api/emergencias/${caso.id}/finalizar`, {
      data: { observaciones: 'Asistencia finalizada; informe privado del caso.' },
    })).status()).toBe(200);
    expect((await page.request.get(`/api/emergencias/${caso.id}`)).status()).toBe(200);
    const ajeno = await other.get(`/api/emergencias/${caso.id}`);
    const ausente = await other.get(`/api/emergencias/${randomUUID()}`);
    expect(ajeno.status()).toBe(404);
    expect(await ajeno.json()).toEqual(await ausente.json());
    expect((await other.get(`/api/emergencias/${caso.id}/foto`)).status()).toBe(404);
    expect((await other.get(`/api/emergencias/${caso.id}/eta?coordenada_x=-58.4&coordenada_y=-34.6`)).status()).toBe(404);
    expect((await other.get('/api/emergencias')).status()).toBe(200);
    const lista = await other.get('/api/emergencias').then(r => r.json());
    expect(lista.some((item: { id: string }) => item.id === caso.id)).toBe(false);
    const storage = await other.storageState();
    await page.context().clearCookies();
    await page.context().addCookies(storage.cookies);
    for (const path of [`/casos/${caso.id}`, `/casos/${randomUUID()}`, `/usuarios/${owner.id}`, `/usuarios/${owner.id}/solicitudes`]) {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: 'Página no encontrada' })).toBeVisible();
      await expect(page.getByText('Asistencia finalizada; informe privado del caso.', { exact: true })).toHaveCount(0);
    }
    await account(page.request, 'COORDINADOR');
    await page.goto(`/casos/${caso.id}`);
    await expect(page.getByText('Asistencia finalizada; informe privado del caso.', { exact: true })).toBeVisible();
  } finally { await other.dispose(); }
});
