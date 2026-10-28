'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, GraduationCap, Megaphone, UserRound, Users } from 'lucide-react';
import type { UsuarioToken } from '@/lib/auth';
import { Campana } from './campana';
import { TemaBoton } from './tema';

export function Navegacion({ usuario, iniciales }: { usuario: UsuarioToken | null; iniciales?: string }) {
  const pathname = usePathname();
  const coordinador = usuario && usuario.rol !== 'VOLUNTARIO';
  const links = usuario ? [
    { href: '/', label: 'Reportar', Icono: Megaphone },
    { href: '/casos', label: 'Casos', Icono: ClipboardList },
    { href: '/formacion', label: 'Formación', Icono: GraduationCap },
    ...(coordinador ? [{ href: '/equipo', label: 'Equipo', Icono: Users }] : []),
    { href: '/cuenta', label: 'Cuenta', Icono: UserRound },
  ] : [];
  const activo = (href: string) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`) || (href === '/equipo' && pathname === '/usuarios');
  const inicial = iniciales || (usuario?.nombreUsuario?.charAt(0).toUpperCase() ?? '');

  return <header className="marco">
    <div className="marco-barra">
      <Link href="/" className="marca">Red de Apoyo</Link>
      {usuario && <nav aria-label="Navegación principal" className="pestanas">
        {links.map(({ href, label, Icono }) => <Link key={href} href={href} aria-current={activo(href) ? 'page' : undefined}>
          <Icono aria-hidden="true" size={24} strokeWidth={activo(href) ? 2.4 : 1.8} /><span>{label}</span>
        </Link>)}
      </nav>}
      <span className="marco-acciones"><TemaBoton />{usuario
        ? <><Campana /><Link href="/cuenta" className="marco-avatar" aria-label={`Tu cuenta (${usuario.nombreUsuario})`}>{inicial}</Link></>
        : <Link className="button button-chico button-secondary" href="/login">Soy voluntario</Link>}</span>
    </div>
  </header>;
}
