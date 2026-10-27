'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/actions/auth';
import type { UsuarioToken } from '@/lib/auth';
import { Badge, Button } from './ui';

export function Navegacion({ usuario }: { usuario: UsuarioToken | null }) {
  const pathname = usePathname();
  const links = [{ href: '/', label: 'Inicio' }, ...(usuario && usuario.rol !== 'VOLUNTARIO' ? [{ href: '/usuarios', label: 'Usuarios' }] : []), { href: '/sistema', label: 'Sistema visual' }];
  return <header className="site-header"><div className="nav-wrap">
    <Link href="/" className="brand"><span className="brand-mark" aria-hidden="true">+</span> Red de Apoyo<span className="brand-sub">Emergencias comunitarias</span></Link>
    <nav aria-label="Navegación principal">{links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? 'page' : undefined}>{link.label}</Link>)}</nav>
    <div className="session">{usuario ? <><span>{usuario.nombreUsuario} <Badge>{usuario.rol === 'ADMIN' ? 'Administrador' : usuario.rol === 'COORDINADOR' ? 'Coordinador' : 'Voluntario'}</Badge></span><form action={logoutAction}><Button className="button-secondary">Salir</Button></form></> : <><Link className="button button-secondary" href="/registro">Registrarse</Link><Link className="button" href="/login">Ingresar</Link></>}</div>
  </div></header>;
}
