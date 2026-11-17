'use client';

import { useState } from 'react';
import { ascensoAction } from '@/app/actions/formularios';
import { Button, Card } from './ui';
import { MarcaRevision } from './marcas';

type Solicitud = { id: string; estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'; creadoEn: string };

export function SolicitudesAscenso({ solicitudes, puedeSolicitar, puedeResolver }: { solicitudes: Solicitud[]; puedeSolicitar: boolean; puedeResolver: boolean }) {

  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<{ error: boolean; texto: string } | null>(null);
  async function operar(accion: 'crear' | 'aprobar' | 'rechazar', id?: string) {
    if (ocupado) return;
    setOcupado(true);
    setAviso(null);
    try {
      const datos = await ascensoAction(accion, id);
      if (!datos.ok) throw new Error(datos.error);
      setAviso({ error: false, texto: accion === 'crear' ? 'Solicitud enviada. Te avisaremos cuando se resuelva.' : accion === 'aprobar' ? 'Ascenso aprobado. Se notificó a la persona.' : 'Ascenso denegado. Se notificó a la persona.' });
    } catch (error) {
      setAviso({ error: true, texto: error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'TypeError' ? error.message : 'No se pudo confirmar el resultado. Actualizá el historial antes de reintentar.' });
    } finally {
      setOcupado(false);

    }
  }
  return <div className="stack" aria-busy={ocupado}>
    {aviso && <p className="alert" role={aviso.error ? 'alert' : 'status'}>{aviso.texto}</p>}
    {puedeSolicitar && <Card><p>Solicitá que coordinación evalúe tu ascenso.</p><Button disabled={ocupado || solicitudes.some(s => s.estado === 'PENDIENTE')} onClick={() => operar('crear')}>Solicitar ascenso</Button>{solicitudes.some(s => s.estado === 'PENDIENTE') && <p>Ya tenés una solicitud pendiente.</p>}</Card>}
    {!solicitudes.length ? <Card><p>No hay solicitudes de ascenso.</p></Card> : solicitudes.map(s => <Card key={s.id}><div className="stack"><strong>Solicitud del {new Date(s.creadoEn).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}</strong><span className="muted">Identificador: {s.id}</span><MarcaRevision estado={s.estado} />{s.estado === 'PENDIENTE' && puedeResolver && <div className="ascenso-estado"><Button disabled={ocupado} onClick={() => operar('aprobar', s.id)}>Ascender a Coordinador</Button><Button className="button-secondary" disabled={ocupado} onClick={() => operar('rechazar', s.id)}>Denegar ascenso</Button></div>}</div></Card>)}
  </div>;
}
