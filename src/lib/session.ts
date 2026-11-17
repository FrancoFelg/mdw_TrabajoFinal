import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import { Rol } from '@prisma/client';
import type { UsuarioToken } from './auth';
import { db } from './db';

export const sessionCookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 28800 };

export async function getSession(): Promise<UsuarioToken | null> {
  const token = (await cookies()).get('token')?.value;
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof payload === 'string' || typeof payload.id !== 'string' || !Object.values(Rol).includes(payload.rol)) return null;
    const actual = await db.usuario.findUnique({ where: { id: payload.id }, select: { id: true, nombreUsuario: true, rol: true } });
    return actual;
  } catch { return null; }
}

export async function requireSession(next?: string) {
  const session = await getSession();
  if (!session) redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  return session;
}

// Destinos permitidos después del login. Nunca redirigir a un `next` arbitrario.
const DESTINOS = ['/cuenta', '/casos', '/notificaciones', '/usuarios', '/sistema', '/ascensos', '/formacion'];

export function safeDestination(value: unknown) {
  if (typeof value !== 'string') return '/casos';
  if (DESTINOS.includes(value) || /^\/casos\/[a-z0-9]{20,64}$/.test(value) || /^\/usuarios\/[a-z0-9]{20,64}(?:\/solicitudes)?$/.test(value)) return value;
  return '/casos';
}
