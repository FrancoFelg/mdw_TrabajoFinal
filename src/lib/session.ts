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

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/login?next=/usuarios');
  return session;
}

export function safeDestination(value: unknown) {
  return value === '/usuarios' || value === '/sistema' ? value : '/';
}
