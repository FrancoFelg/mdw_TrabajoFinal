'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { ClipboardList, LogOut, Megaphone, UserRound, Users } from 'lucide-react';
import { logoutAction } from '@/app/actions/auth';
import type { UsuarioToken } from '@/lib/auth';
import { Campana } from './campana';
import { TemaBoton } from './tema';
import { BotonEnviar } from './boton-enviar';

// Cada pantalla suma su pestaña cuando existe (Formación, Equipo, Cuenta).
export function Navegacion({ usuario, iniciales }: { usuario: UsuarioToken | null; iniciales?: string }) {
  const pathname = usePathname();
  const [cuentaAbierta, setCuentaAbierta] = useState(false);
  const cuentaRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLButtonElement>(null);
  const cuentaId = useId();

  useEffect(() => {
    if (!cuentaAbierta) return;
    const cerrarFuera = (event: PointerEvent) => {
      if (!cuentaRef.current?.contains(event.target as Node)) setCuentaAbierta(false);
    };
    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCuentaAbierta(false);
        avatarRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', cerrarFuera);
    document.addEventListener('keydown', cerrarConEscape);
    return () => {
      document.removeEventListener('pointerdown', cerrarFuera);
      document.removeEventListener('keydown', cerrarConEscape);
    };
  }, [cuentaAbierta]);
  const coordinador = usuario && usuario.rol !== 'VOLUNTARIO';
  const links = usuario ? [
    { href: '/reportar', label: 'Reportar', Icono: Megaphone },
    { href: '/casos', label: 'Casos', Icono: ClipboardList },
    { href: '/formacion', label: 'Formación', Icono: ClipboardList },
    ...(usuario.rol === 'VOLUNTARIO' ? [{ href: '/ascensos', label: 'Mis ascensos', Icono: Users }] : []),
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
      <div className="marco-acciones"><TemaBoton />{usuario
        ? <><Campana /><div className="marco-identidad"><strong title={usuario.nombreUsuario}>{usuario.nombreUsuario}</strong><span>{({ VOLUNTARIO: 'Voluntario', COORDINADOR: 'Coordinador', ADMIN: 'Administrador' })[usuario.rol ?? 'VOLUNTARIO']}</span></div><div className="cuenta-desplegable" ref={cuentaRef} onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget)) setCuentaAbierta(false);
        }}>
          <button ref={avatarRef} type="button" className="marco-avatar" aria-label={`Opciones de cuenta (${usuario.nombreUsuario})`} aria-expanded={cuentaAbierta} aria-controls={cuentaId} onClick={() => setCuentaAbierta(!cuentaAbierta)}>{inicial}</button>
          {cuentaAbierta && <div id={cuentaId} className="cuenta-opciones">
            <p className="cuenta-nombre">{usuario.nombreUsuario}</p>
            <Link href="/cuenta" onClick={() => setCuentaAbierta(false)}><UserRound aria-hidden="true" size={18} />Mi cuenta</Link>
            <form action={logoutAction}><BotonEnviar><LogOut aria-hidden="true" size={18} />Cerrar sesión</BotonEnviar></form>
          </div>}
        </div></>
        : <Link className="button button-chico button-secondary" href="/login">Soy voluntario</Link>}</div>
    </div>
  </header>;
}
