import { LogOut } from 'lucide-react';
import { UsuarioService } from '../../../../services/usuario.service';
import { SolicitudAscensoService } from '../../../../services/solicitudAscenso.service';
import { CertificadoService } from '../../../../services/certificado.service';
import { requireSession } from '@/lib/session';
import { logoutAction } from '@/app/actions/auth';
import { estadoHabilitacion, fechaCorta } from '@/lib/casos';
import { Habilitacion, MarcaRevision, iniciales } from '@/components/marcas';
import { SolicitarAscenso } from '@/components/equipo-forms';
import { Apariencia } from '@/components/tema';
import { cookies } from 'next/headers';
import { COOKIE_TEMA, leerTema } from '@/lib/tema';

export const metadata = { title: 'Tu cuenta | Red de Apoyo' };

const ROLES: Record<string, string> = { ADMIN: 'Administrador', COORDINADOR: 'Coordinador', VOLUNTARIO: 'Voluntario' };

export default async function Cuenta() {
  const sesion = await requireSession('/cuenta');
  const [perfil, solicitudes, certificados] = await Promise.all([
    new UsuarioService().obtenerPerfil(sesion.id),
    new SolicitudAscensoService().listar(),
    new CertificadoService().listarCertificados(),
  ]);
  const nombre = `${perfil.persona.nombre} ${perfil.persona.apellido}`;
  const ultima = solicitudes.find(s => s.usuarioId === sesion.id);
  const tema = leerTema((await cookies()).get(COOKIE_TEMA)?.value);
  const estado = estadoHabilitacion(certificados.filter(c => c.usuarioId === sesion.id));

  return <section className="cuenta">
    <header className="identidad">
      <span className="avatar-grande" aria-hidden="true">{iniciales(nombre)}</span>
      <span className="identidad-texto">
        <h1>{nombre}</h1>
        <span className="muted">@{perfil.nombreUsuario} · {ROLES[perfil.rol]}</span>
      </span>
    </header>

    <Habilitacion estado={estado} />

    {perfil.rol === 'VOLUNTARIO' && <section className="bloque" aria-labelledby="ascenso">
      <h2 id="ascenso">Ascenso a coordinador</h2>
      <div className="grupo">
        <div className="grupo-fila grupo-fila-texto">
          <span>Coordinar es validar certificados, administrar cursos y responder pedidos de ascenso.</span>
        </div>
        {ultima && <div className="grupo-fila">
          <span className="grupo-etiqueta">Tu pedido del {fechaCorta(ultima.creadoEn)}</span>
          <MarcaRevision estado={ultima.estado} />
        </div>}
        {ultima?.estado === 'PENDIENTE' && <div className="grupo-fila grupo-fila-texto"><span className="muted">Alguien de coordinación lo está revisando.</span></div>}
        {ultima?.estado === 'RECHAZADO' && <div className="grupo-fila grupo-fila-texto"><span className="muted">Esta vez no se aprobó. Podés volver a pedirlo cuando sumes experiencia o certificados.</span></div>}
        {ultima?.estado !== 'PENDIENTE' && <SolicitarAscenso />}
      </div>
    </section>}

    <section className="bloque" aria-labelledby="apariencia">
      <h2 id="apariencia">Apariencia</h2>
      <Apariencia inicial={tema} />
      <p className="muted">Automático sigue el modo de tu celular o computadora.</p>
    </section>

    <section className="bloque" aria-labelledby="sesion">
      <h2 id="sesion" className="sr-only">Sesión</h2>
      <form action={logoutAction} className="grupo">
        <button className="grupo-fila grupo-boton grupo-peligro"><span className="grupo-etiqueta grupo-accion"><LogOut aria-hidden="true" size={20} />Cerrar sesión</span></button>
      </form>
    </section>
  </section>;
}
