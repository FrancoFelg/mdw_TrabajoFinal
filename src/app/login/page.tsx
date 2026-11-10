import { redirect } from 'next/navigation';
import { getSession, safeDestination } from '@/lib/session';
import { LoginForm } from '@/components/login-form';
import { Card } from '@/components/ui';

export const metadata = { title: 'Ingresar | Red de Apoyo' };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeDestination((await searchParams).next);
  if (await getSession()) redirect(next);
  return <section className="login-layout"><div className="stack-chico"><h1>Ingresá a la red</h1><p className="lead">Para ver los casos libres, tomar uno y cargar tus certificados.</p></div><Card><h2>Iniciar sesión</h2><LoginForm next={next} /></Card></section>;
}
