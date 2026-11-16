import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { SinDatos } from '@/components/sin-datos';
import { SolicitudesAscenso } from '@/components/solicitudes-ascenso';
import { Refrescar } from '@/components/refrescar';
import { db } from '../../../../../../config/database';
import { SolicitudAscensoRepository } from '../../../../../../repositories/solicitudAscenso.repository';

export const metadata = { title: 'Solicitudes de ascenso | Red de Apoyo' };

export default async function Solicitudes({ params }: { params: Promise<{ id: string }> }) {
  const sesion = await requireSession('/usuarios');
  const actor = await db.usuario.findUniqueOrThrow({ where: { id: sesion.id }, select: { rol: true } });
  if (actor.rol !== 'COORDINADOR' && actor.rol !== 'ADMIN') return <SinDatos titulo="Acceso restringido"><p>Solo coordinación puede evaluar solicitudes.</p></SinDatos>;
  const { id } = await params;
  const usuario = await db.usuario.findUnique({ where: { id }, select: { persona: { select: { nombre: true, apellido: true } } } });
  if (!usuario) notFound();
  const solicitudes = await new SolicitudAscensoRepository().findAll(id);
  return <section className="stack"><Refrescar segundos={30} /><Link href="/usuarios">Volver a usuarios</Link><header className="pagina-cabecera"><h1>Solicitudes de {usuario.persona.nombre} {usuario.persona.apellido}</h1><p className="muted">Todas las solicitudes, pasadas y actuales, con su resultado.</p></header><SolicitudesAscenso solicitudes={solicitudes.map(s => ({ id: s.id, estado: s.estado, creadoEn: s.creadoEn.toISOString() }))} puedeSolicitar={false} puedeResolver={sesion.id !== id} /></section>;
}
