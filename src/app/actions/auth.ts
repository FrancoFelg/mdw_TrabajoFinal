'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { type ResultadoFormulario } from '@/lib/formulario';
import { AuthService } from '../../../services/auth.service';
import { getSession, safeDestination, sessionCookie } from '@/lib/session';

export async function loginAction(_state: unknown, data: FormData): Promise<ResultadoFormulario> {
  // Inicio público: se permite autenticar también cuando una sesión anterior venció.
  await getSession();
  const nombreUsuario = String(data.get('nombreUsuario') ?? '').trim();
  const password = String(data.get('password') ?? '');
  if (!nombreUsuario || !password) return { ok: false, error: '', campos: { ...(!nombreUsuario ? { nombreUsuario: 'Ingresá tu usuario o email.' } : {}), ...(!password ? { password: 'Ingresá tu contraseña.' } : {}) } };
  try {
    const result = await new AuthService().login(nombreUsuario, password);
    (await cookies()).set('token', result.token, sessionCookie);
  } catch (error) {
    const codigo = error instanceof Error ? error.message : '';
    return { ok: false, campos: {}, error: codigo === 'CREDANCIALES_INVALIDAS' ? 'Usuario o contraseña incorrectos.'
      : codigo === 'DEMASIADOS_INTENTOS' ? 'Demasiados intentos fallidos. Esperá unos minutos antes de volver a intentar.'
      : 'No pudimos iniciar sesión. Intentá nuevamente en unos momentos.' };
  }
  redirect(safeDestination(data.get('next')));
}

export async function logoutAction() {
  await getSession(); // Cerrar sesión es idempotente, incluso cuando el token venció.
  (await cookies()).delete('token');
  redirect('/');
}
