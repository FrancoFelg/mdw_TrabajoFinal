'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';
import { Alert, Button, Input } from './ui';

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, { error: '' });
  return <form action={action} className="stack" aria-busy={pending}>
    <input type="hidden" name="next" value={next} />
    <div className="field"><label htmlFor="nombreUsuario">Nombre de usuario</label><Input id="nombreUsuario" name="nombreUsuario" autoComplete="username" required maxLength={100} /></div>
    <div className="field"><label htmlFor="password">Contraseña</label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div>
    {state.error && <Alert>{state.error}</Alert>}
    <Button disabled={pending}>{pending ? 'Ingresando…' : 'Iniciar sesión'}</Button>
    <p className="muted">¿No tenés cuenta? <Link href="/registro" className="text-link">Registrarse</Link></p>
  </form>;
}
