import { redirect } from 'next/navigation';
import { getSession, safeDestination } from '@/lib/session';
import { LoginForm } from '@/components/login-form';
import { Card } from '@/components/ui';

export const metadata = { title: 'Ingresar | Red de Apoyo' };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeDestination((await searchParams).next);
  if (await getSession()) redirect(next);
  return <section className="login-layout"><div><p className="eyebrow">Cada persona cuenta</p><h1>Tu ayuda empieza por estar conectado.</h1><p className="lead">Un espacio para quienes acompañan, se capacitan y hacen comunidad.</p></div><Card><p className="eyebrow">Bienvenido a la red</p><h2>Iniciar sesión</h2><LoginForm next={next} /></Card></section>;
}
