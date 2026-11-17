import Link from 'next/link';

// Secciones de «Formación». Revisar solo aparece para coordinación.
export function FormacionPestanas({ actual, coordinacion }: { actual: 'certificados' | 'cursos' | 'revisar'; coordinacion: boolean }) {
  const enlaces = [
    { clave: 'certificados', href: '/certificados', texto: 'Mis certificados' },
    { clave: 'cursos', href: '/cursos', texto: 'Cursos' },
    ...(coordinacion ? [{ clave: 'revisar', href: '/certificados/revisar', texto: 'Revisar' }] : []),
  ];
  return <nav className="segmentos segmentos-enlaces" aria-label="Secciones de formación">
    {enlaces.map(e => <Link key={e.clave} href={e.href} aria-current={e.clave === actual ? 'page' : undefined}>{e.texto}</Link>)}
  </nav>;
}
