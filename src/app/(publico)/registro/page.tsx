import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { Card } from '@/components/ui';
import { RegistroForm } from '@/components/registro-form';

export const metadata = { title: 'Registrarse | Red de Apoyo' };

export default async function Registro() {
  if (await getSession()) redirect('/');
  return (
    <section className="login-layout">
      <div className="stack-chico">
        <h1>Sumate como voluntario</h1>
        <p className="lead">Con tu cuenta vas a poder tomar casos y cargar tus certificados. Arrancás con el rol de Voluntario.</p>
      </div>
      <Card>
        <h2>Crear cuenta</h2>
        <RegistroForm />
      </Card>
    </section>
  );
}
