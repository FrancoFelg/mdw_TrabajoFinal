import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { Card } from '@/components/ui';
import { RegistroForm } from '@/components/registro-form';

export const metadata = { title: 'Registrarse | Red de Apoyo' };

export default async function Registro() {
  if (await getSession()) redirect('/');
  return (
    <section className="login-layout">
      <div>
        <p className="eyebrow">Sumate a la comunidad</p>
        <h1>Tu compromiso hace la diferencia.</h1>
        <p className="lead">Creá tu cuenta para formar parte de la red de apoyo. Tu perfil inicial será Voluntario.</p>
      </div>
      <Card>
        <h2>Crear cuenta</h2>
        <RegistroForm />
      </Card>
    </section>
  );
}
