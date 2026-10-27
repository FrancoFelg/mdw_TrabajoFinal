'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthService } from '../../../services/auth.service';
import { safeDestination, sessionCookie } from '@/lib/session';

export async function loginAction(_state: { error: string }, data: FormData) {
  const nombreUsuario = String(data.get('nombreUsuario') ?? '').trim();
  const password = String(data.get('password') ?? '');
  if (!nombreUsuario || !password) return { error: 'Ingresá tu usuario y contraseña.' };
  try {
    const result = await new AuthService().login(nombreUsuario, password);
    (await cookies()).set('token', result.token, sessionCookie);
  } catch (error) {
    return { error: error instanceof Error && error.message === 'CREDANCIALES_INVALIDAS' ? 'Usuario o contraseña incorrectos.' : 'No pudimos iniciar sesión. Intentá nuevamente en unos momentos.' };
  }
  redirect(safeDestination(data.get('next')));
}

export async function logoutAction() {
  (await cookies()).delete('token');
  redirect('/login');
}
