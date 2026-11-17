'use client';

import { Formulario } from './formulario';
import Link from 'next/link';
import { loginAction } from '@/app/actions/auth';
import { Button, Input } from './ui';

export function LoginForm({ next }: { next: string }) {
  return <Formulario id="login" action={datos => loginAction(null, datos)}>
    <input type="hidden" name="next" value={next} />
    <div className="field"><label htmlFor="nombreUsuario">Nombre de usuario o email</label><Input id="nombreUsuario" name="nombreUsuario" autoComplete="username" required maxLength={191} /></div>
    <div className="field"><label htmlFor="password">Contraseña</label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div>

    <Button>Iniciar sesión</Button>
    <p className="muted">¿No tenés cuenta? <Link href="/registro" className="text-link">Registrarse</Link></p>
  </Formulario>;
}
