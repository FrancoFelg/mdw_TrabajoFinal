import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import jwt from 'jsonwebtoken';
import { Rol } from '@prisma/client';
import type { UsuarioToken } from './auth';

export const sessionCookie = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 28800 };

export async function getSession(): Promise<UsuarioToken | null> {
  const token = (await cookies()).get('token')?.value;
  if (!token || !process.env.JWT_SECRET) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof payload === 'string' || typeof payload.id !== 'string' || !Object.values(Rol).includes(payload.rol)) return null;
    return { id: payload.id, nombreUsuario: payload.nombreUsuario, rol: payload.rol };
  } catch { return null; }
}

export async function requireSession(next?: string) {
  const session = await getSession();
  if (!session) redirect(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  return session;
}

// Destinos permitidos después del login. Nunca redirigir a un `next` arbitrario.
const DESTINOS = ['/casos', '/formacion', '/equipo', '/cuenta', '/notificaciones', '/usuarios', '/sistema'];

export function safeDestination(value: unknown) {
  if (typeof value !== 'string') return '/casos';
  if (DESTINOS.includes(value) || /^\/casos\/[a-z0-9]{20,40}$/.test(value)) return value;
  return '/casos';
}
