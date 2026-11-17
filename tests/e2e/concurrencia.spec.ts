import { test, expect } from '@playwright/test';
import { account, db, report } from './helpers';

test.afterAll(async () => db.$disconnect());
test('H10: diez voluntarios toman el mismo caso; exactamente uno gana', async ({ playwright, request }) => {
  const caso = await report(request);
  const clients = await Promise.all(Array.from({ length: 10 }, () => playwright.request.newContext({ baseURL: 'http://127.0.0.1:3100' })));
  try {
    await Promise.all(clients.map(client => account(client)));
    const responses = await Promise.all(clients.map(client => client.post(`/api/emergencias/${caso.id}/tomar`)));
    const statuses = responses.map(response => response.status());
    console.log('Diez solicitudes, HTTP:', statuses);
    expect(statuses.filter(status => status === 200)).toHaveLength(1);
    expect(statuses.filter(status => status === 409)).toHaveLength(9);
    expect(await db.usuarioEmergencia.count({ where: { emergenciaId: caso.id } })).toBe(1);
  } finally { await Promise.all(clients.map(client => client.dispose())); }
});

test('H10: un voluntario no puede tomar diez casos simultáneos', async ({ request }) => {
  const user = await account(request);
  const casos = await Promise.all(Array.from({ length: 10 }, () => report(request)));
  const responses = await Promise.all(casos.map(caso => request.post(`/api/emergencias/${caso.id}/tomar`)));
  const statuses = responses.map(response => response.status());
  console.log('Un voluntario, diez casos, HTTP:', statuses);
  expect(statuses.filter(status => status === 200)).toHaveLength(1);
  expect(statuses.filter(status => status === 409)).toHaveLength(9);
  expect(await db.emergencia.count({ where: { estado: 'EN_CAMINO', usuarios: { some: { usuarioId: user.id } } } })).toBe(1);
});
