import { requireSession } from '@/lib/session';
import { Formacion } from '@/components/formacion';
import { db } from '../../../../config/database';

export default async function FormacionPage() {
  const actor = await requireSession('/formacion');
  const coordinador = actor.rol === 'COORDINADOR' || actor.rol === 'ADMIN';
  const [iniciales, cursos] = await Promise.all([
    db.certificado.findMany({ where: { fechaEliminacion: null, ...(coordinador ? {} : { usuarioId: actor.id }) },
      orderBy: { fechaCreacion: 'desc' }, select: { id: true, codigoVerificacion: true, estado: true, archivo: true,
        motivoRechazo: true, curso: { select: { titulo: true } }, usuario: { select: { nombreUsuario: true } } } }),
    db.cursos.findMany({ where: { fechaEliminacion: null }, select: { id: true, titulo: true } }),
  ]);
  return <section className="stack"><h1>Formación y certificados</h1>
    <Formacion coordinador={coordinador} iniciales={iniciales} cursos={cursos} />
  </section>;
}
