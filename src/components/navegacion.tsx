'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ClipboardList, Megaphone, Users } from 'lucide-react';
import type { UsuarioToken } from '@/lib/auth';
import { TemaBoton } from './tema';

// Each team member adds the tab for their screen when it exists (Formación, Equipo, Cuenta).
export function Navegacion({ usuario, iniciales }: { usuario: UsuarioToken | null; iniciales?: string }) {
  const pathname = usePathname();
  const coordinador = usuario && usuario.rol !== 'VOLUNTARIO';
  const links = usuario ? [
    { href: '/', label: 'Reportar', Icono: Megaphone },
    { href: '/casos', label: 'Casos', Icono: ClipboardList },
    ...(coordinador ? [{ href: '/usuarios', label: 'Usuarios', Icono: Users }] : []),
  ] : [];
  const activo = (href: string) => href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
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
        ? <Link href="/cuenta" className="marco-avatar" aria-label={`Tu cuenta (${usuario.nombreUsuario})`}>{inicial}</Link>
        : <Link className="button button-chico button-secondary" href="/login">Soy voluntario</Link>}</span>
    </div>
  </header>;
}
