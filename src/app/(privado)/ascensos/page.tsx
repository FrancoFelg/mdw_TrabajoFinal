import { requireSession } from '@/lib/session';
import { db } from '../../../../config/database';
import { SolicitudAscensoRepository } from '../../../../repositories/solicitudAscenso.repository';
import { SolicitudesAscenso } from '@/components/solicitudes-ascenso';
import { Refrescar } from '@/components/refrescar';

export const metadata = { title: 'Mis solicitudes de ascenso | Red de Apoyo' };

export default async function Ascensos() {
  const sesion = await requireSession('/ascensos');
  const usuario = await db.usuario.findUniqueOrThrow({ where: { id: sesion.id }, select: { rol: true } });
  const solicitudes = await new SolicitudAscensoRepository().findAll(sesion.id);
  return <section className="stack"><Refrescar segundos={30} /><header className="pagina-cabecera"><h1>Mis solicitudes de ascenso</h1><p className="muted">Historial completo y resultado de cada solicitud.</p></header><SolicitudesAscenso solicitudes={solicitudes.map(s => ({ id: s.id, estado: s.estado, creadoEn: s.creadoEn.toISOString() }))} puedeSolicitar={usuario.rol === 'VOLUNTARIO'} puedeResolver={false} /></section>;
}
