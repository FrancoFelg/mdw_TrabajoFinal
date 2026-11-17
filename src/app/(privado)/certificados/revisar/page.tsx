import { requireSession } from '@/lib/session';
import { RevisionCertificados } from '@/components/revision-certificados';
import { FormacionPestanas } from '@/components/formacion-pestanas';
import { db } from '../../../../../config/database';

export const metadata = { title: 'Revisar certificados | Red de Apoyo' };

export default async function RevisarCertificados() {
  const sesion = await requireSession('/certificados/revisar');
  // Rol vigente en la base: el JWT puede ser anterior a un cambio de rol.
  const actor = await db.usuario.findUnique({ where: { id: sesion.id }, select: { rol: true } });
  if (actor?.rol !== 'COORDINADOR' && actor?.rol !== 'ADMIN') {
    return <section className="stack"><h1>Revisar certificados</h1><p className="alert" role="alert">Solo coordinación puede revisar certificados.</p></section>;
  }
  const certificados = await db.certificado.findMany({
    where: { fechaEliminacion: null },
    orderBy: { fechaCreacion: 'asc' },
    include: { curso: { select: { titulo: true } }, usuario: { select: { nombreUsuario: true } } },
  });
  return <section className="stack">
    <FormacionPestanas actual="revisar" coordinacion />
    <header className="pagina-cabecera"><h1>Revisar certificados</h1><p className="muted">Aprobá o rechazá cada certificado. Un rechazo necesita motivo y se avisa a la persona.</p></header>
    <RevisionCertificados certificados={certificados.map(c => ({
      id: c.id, nombre: c.nombre, entidadEmisora: c.entidadEmisora, fechaEmision: c.fechaEmision.toISOString(),
      codigoVerificacion: c.codigoVerificacion, estado: c.estado, motivoRechazo: c.motivoRechazo,
      persona: c.usuario.nombreUsuario, curso: c.curso?.titulo ?? null, propio: c.usuarioId === sesion.id,
    }))} />
  </section>;
}
