import { expect, type APIRequestContext } from '@playwright/test';
import { PrismaClient, type Rol } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export const db = new PrismaClient();
export const password = 'E2e-segura-2026!';
export async function account(request: APIRequestContext, rol: Rol = 'VOLUNTARIO') {
  const nombreUsuario = `e2e_${randomUUID().replaceAll('-', '')}`;
  const email = `${nombreUsuario}@example.test`;
  const response = await request.post('/api/usuarios', { data: {
    nombreUsuario, email, password,
    persona: { nombre: 'Prueba', apellido: 'Local', fechaNac: '1990-01-01' },
  } });
  expect(response.status()).toBe(201);
  const user = await db.usuario.findUniqueOrThrow({ where: { nombreUsuario } });
  // Datos de prueba aislados: cuentas normales, sin bypass ni ramas en la aplicación.
  if (rol !== 'VOLUNTARIO') await db.usuario.update({ where: { id: user.id }, data: { rol } });
  const login = await request.post('/api/auth/login', { data: { nombreUsuario, password } });
  expect(login.status()).toBe(200);
  return { ...user, email, rol };
}
export async function report(request: APIRequestContext, prioridad = 'VERDE') {
  const response = await request.post('/api/emergencias', { data: {
    descripcion: `Persona necesita asistencia ${randomUUID()}`, prioridad,
    coordenada_x: -58.38, coordenada_y: -34.60, provincia: 'CABA',
  } });
  expect(response.status()).toBe(201);
  return response.json();
}
