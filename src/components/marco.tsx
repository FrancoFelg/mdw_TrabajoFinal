import { Navegacion } from './navegacion';
import { iniciales } from './marcas';
import type { UsuarioToken } from '@/lib/auth';
import { UsuarioService } from '../../services/usuario.service';

export async function Marco({ usuario, children }: { usuario: UsuarioToken | null; children: React.ReactNode }) {
  // Iniciales del nombre real para el avatar del encabezado (el token solo trae el nombre de usuario).
  const perfil = usuario ? await new UsuarioService().obtenerPerfil(usuario.id).catch(() => null) : null;
  return <div className={`marco-pagina${usuario ? ' con-sesion' : ''}`}>
    <a href="#contenido" className="skip-link">Saltar al contenido</a>
    <Navegacion usuario={usuario} iniciales={perfil ? iniciales(`${perfil.persona.nombre} ${perfil.persona.apellido}`) : undefined} />
    <main id="contenido" className="container">{children}</main>
    <footer className="site-footer"><strong>Red de Apoyo</strong><span>Trabajo final · Metodologías de Desarrollo Web · UAI</span></footer>
  </div>;
}
