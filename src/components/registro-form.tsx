'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { registroAction } from '@/app/actions/registro';
import { Alert, Button, Input } from './ui';

export function RegistroForm() {
  const [state, action, pending] = useActionState(registroAction, { error: '', success: false });

  if (state.success) {
    return <div className="stack" role="status"><h3>Cuenta creada</h3><p>Ya podés iniciar sesión con tu usuario y contraseña.</p><Link href="/login" className="button">Iniciar sesión</Link></div>;
  }

  return (
    <form action={action} className="stack" aria-busy={pending}>
      <div className="field"><label htmlFor="nombre">Nombre</label><Input id="nombre" name="nombre" autoComplete="given-name" required maxLength={100} /></div>
      <div className="field"><label htmlFor="apellido">Apellido</label><Input id="apellido" name="apellido" autoComplete="family-name" required maxLength={100} /></div>
      <div className="field"><label htmlFor="fechaNac">Fecha de nacimiento</label><Input id="fechaNac" name="fechaNac" type="date" autoComplete="bday" required /></div>
      <div className="field"><label htmlFor="usuario-registro">Nombre de usuario</label><Input id="usuario-registro" name="nombreUsuario" autoComplete="username" required maxLength={100} /></div>
      <div className="field"><label htmlFor="password-registro">Contraseña</label><Input id="password-registro" name="password" type="password" autoComplete="new-password" required minLength={8} aria-describedby="ayuda-password" /><p id="ayuda-password" className="muted">Al menos 8 caracteres; máximo 72 bytes.</p></div>
      <div className="field"><label htmlFor="confirmar-password">Confirmar contraseña</label><Input id="confirmar-password" name="confirmarPassword" type="password" autoComplete="new-password" required minLength={8} /></div>
      {state.error && <Alert>{state.error}</Alert>}
      <Button disabled={pending}>{pending ? 'Creando cuenta…' : 'Registrarse'}</Button>
      <p className="muted">¿Ya tenés cuenta? <Link href="/login" className="text-link">Iniciar sesión</Link></p>
    </form>
  );
}
