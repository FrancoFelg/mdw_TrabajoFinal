import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { PrismaClient, type Rol } from '@prisma/client';
import { randomUUID } from 'node:crypto';

export const db = new PrismaClient();
export const password = 'E2e-segura-2026!';

export async function registerInBrowser(page: Page) {
  const nombreUsuario = `e2e_${randomUUID().replaceAll('-', '')}`;
  const email = `${nombreUsuario}@example.test`;
  await page.goto('/registro');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Nombre', { exact: true }).fill('Prueba');
  await page.getByLabel('Apellido', { exact: true }).fill('Navegador');
  await page.getByLabel('Fecha de nacimiento').fill('1990-01-01');
  await page.getByLabel('Nombre de usuario', { exact: true }).fill(nombreUsuario);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByLabel('Confirmar contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Registrarse', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cuenta creada', exact: true })).toBeVisible();
  const user = await db.usuario.findUniqueOrThrow({ where: { nombreUsuario } });
  expect(user.rol).toBe('VOLUNTARIO');
  return { ...user, email };
}

export async function loginInBrowser(page: Page, email: string, destination: string) {
  await page.goto(`/login?next=${encodeURIComponent(destination)}`);
  await page.getByLabel('Nombre de usuario o email').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:3100${destination}`);
}

export async function logoutInBrowser(page: Page, nombreUsuario: string) {
  await page.getByRole('button', { name: `Opciones de cuenta (${nombreUsuario})` }).click();
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page).toHaveURL('http://127.0.0.1:3100/');
  expect(await page.request.get('/api/usuarios/me').then(r => r.status())).toBe(401);
  await page.goto('/casos');
  await expect(page).toHaveURL(/\/login\?next=/);
}
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

export const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF');
export const datosCertificado = { nombre: 'Primeros auxilios', entidadEmisora: 'Cruz Roja Argentina', fechaEmision: '2026-01-15' };

// Carga un certificado sin curso desde /certificados/nuevo y vuelve al listado.
export async function cargarCertificado(page: Page, { nombre, codigo }: { nombre: string; codigo: string }) {
  await page.goto('/certificados/nuevo');
  await page.getByLabel('Nombre del certificado').fill(nombre);
  await page.getByLabel('Entidad emisora').fill(datosCertificado.entidadEmisora);
  await page.getByLabel('Fecha de emisión').fill(datosCertificado.fechaEmision);
  await page.getByLabel('Número de certificado').fill(codigo);
  await page.getByLabel('Archivo', { exact: true }).setInputFiles({ name: 'curso.pdf', mimeType: 'application/pdf', buffer: pdf });
  await page.getByRole('button', { name: 'Cargar certificado' }).click();
  await expect(page).toHaveURL(/\/certificados$/);
}
