import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { account, db } from './helpers';

const rows = [...readFileSync('docs/api.md', 'utf8').matchAll(/^\| `([A-Z]+) ([^`]+)` \|[^|]+\| ([^|]+)\|/gm)]
  .map(match => ({ method: match[1], path: match[2], role: match[3].replaceAll('**', '').trim() }));
test.afterAll(async () => db.$disconnect());
for (const actor of ['ANONIMO', 'VOLUNTARIO', 'COORDINADOR', 'ADMIN'] as const) {
  test.describe(actor, () => {
    for (const row of rows) test(`${row.method} ${row.path} exige ${row.role}`, async ({ request }) => {
      if (actor !== 'ANONIMO') await account(request, actor);
      const publicRoute = row.role === 'Público';
      const allowed = publicRoute || (actor !== 'ANONIMO' && (
        row.role === 'Autenticado' ||
        (row.role === 'Coordinador' && ['COORDINADOR', 'ADMIN'].includes(actor)) ||
        (row.role.startsWith('Voluntario') && actor === 'VOLUNTARIO')
      ));
      const response = await request.fetch(row.path.replace(':id', 'e2e-inexistente'), {
        method: row.method, ...(row.method === 'GET' ? {} : { data: {} }),
      });
      if (!allowed) expect(response.status()).toBe(actor === 'ANONIMO' ? 401 : 403);
      else {
        // Payload vacío: el permiso debe pasar antes de validación o recurso inexistente.
        expect([200, 201, 400, 404, 409, 422]).toContain(response.status());
        if (!row.path.includes(':id') || row.path.startsWith('/api/solicitudes-certificados')) expect(response.status()).not.toBe(404);
      }
      expect(await response.text()).not.toMatch(/"(?:password|passwordHash|password_hash)"|\$2[aby]\$/i);
    });
  });
}
