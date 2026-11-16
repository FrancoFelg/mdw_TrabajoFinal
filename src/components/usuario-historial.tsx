import { db } from '../../config/database';
import { Card } from './ui';

const fecha = (valor: Date) => valor.toLocaleDateString('es-AR', { timeZone: 'UTC' });
const estado = (valor: string) => valor.replaceAll('_', ' ');

export async function UsuarioHistorial({ usuarioId }: { usuarioId: string }) {
  const [emergencias, certificados] = await Promise.all([
    db.usuarioEmergencia.findMany({
      where: { usuarioId }, orderBy: { creadoEn: 'desc' },
      select: { id: true, emergencia: { select: { descripcion: true, fecha: true, estado: true, prioridad: true, ubicacion: { select: { direccion: true } } } } },
    }),
    db.certificado.findMany({
      where: { usuarioId, fechaEliminacion: null }, orderBy: { fechaEmision: 'desc' },
      select: { id: true, codigoVerificacion: true, estado: true, fechaEmision: true, curso: { select: { titulo: true, descripcion: true, fechaDesde: true, fechaHasta: true } } },
    }),
  ]);
  return <>
    <Card><h2>Historial de emergencias</h2><p>Emergencias tomadas por este usuario, incluidas las finalizadas.</p>
      {emergencias.length ? <ul>{emergencias.map(({ id, emergencia: e }) => <li key={id}>
        <strong>{e.descripcion}</strong><p>{fecha(e.fecha)} · {estado(e.estado)} · Prioridad {e.prioridad}</p>
        {e.ubicacion.direccion && <p>{e.ubicacion.direccion}</p>}
      </li>)}</ul> : <p>Sin emergencias registradas.</p>}
    </Card>
    <Card><h2>Cursos y certificados</h2>
      {certificados.length ? <ul>{certificados.map(c => <li key={c.id}>
        <strong>{c.curso?.titulo ?? 'Certificado sin curso asociado'}</strong>
        {c.curso && <><p>{c.curso.descripcion}</p><p>Curso: {fecha(c.curso.fechaDesde)} al {fecha(c.curso.fechaHasta)}</p></>}
        <p>Certificado: {c.codigoVerificacion} · {estado(c.estado)} · Emitido: {fecha(c.fechaEmision)}</p>
      </li>)}</ul> : <p>Sin cursos ni certificados registrados.</p>}
    </Card>
  </>;
}
