import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { puedeGestionarUsuarios } from '@/lib/usuarios-admin';
import { UsuarioPerfil } from '@/components/usuario-perfil';
import { UsuarioHistorial } from '@/components/usuario-historial';
import { UsuarioService } from '../../../../../services/usuario.service';

export default async function Perfil({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireSession(`/usuarios/${id}`);
  if (!await puedeGestionarUsuarios(actor.id)) notFound();
  const usuario = await new UsuarioService().obtenerPerfil(id).catch(error => {
    if (error instanceof Error && error.message === 'USUARIO_NO_ENCONTRADO') notFound();
    throw error;
  });
  return <section className="stack"><Link href="/usuarios">Volver a usuarios</Link><UsuarioPerfil key={usuario.id} usuario={{ id: usuario.id, nombreUsuario: usuario.nombreUsuario, email: usuario.email, rol: usuario.rol, persona: { ...usuario.persona, fechaNac: usuario.persona.fechaNac.toISOString().slice(0, 10) } }} /><UsuarioHistorial usuarioId={id} /></section>;
}
