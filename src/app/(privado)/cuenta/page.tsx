import { requireSession } from '@/lib/session';
import { UsuarioPerfil } from '@/components/usuario-perfil';
import { UsuarioHistorial } from '@/components/usuario-historial';
import { UsuarioService } from '../../../../services/usuario.service';

export default async function Cuenta() {
  const actor = await requireSession('/cuenta');
  const usuario = await new UsuarioService().obtenerPerfil(actor.id);
  return <section className="stack">
    <h1>Mi cuenta</h1>
    <UsuarioPerfil propia usuario={{ id: usuario.id, nombreUsuario: usuario.nombreUsuario, rol: usuario.rol,
      persona: { ...usuario.persona, fechaNac: usuario.persona.fechaNac.toISOString().slice(0, 10) } }} />
    <UsuarioHistorial usuarioId={actor.id} />
  </section>;
}
