import { CheckCheck, Clock, OctagonAlert, ShieldEllipsis } from 'lucide-react';
import { NotificacionService, clavePublicaPush } from '../../../../services/notificacion.service';
import { requireSession } from '@/lib/session';
import { haceCuanto } from '@/lib/casos';
import { marcarTodasAction } from '@/app/actions/notificaciones';
import { ActivarPush } from '@/components/activar-push';
import { AvisoItem } from '@/components/aviso-item';
import { Refrescar } from '@/components/refrescar';

export const metadata = { title: 'Avisos | Red de Apoyo' };

const ICONO = { CASO_ROJO: OctagonAlert, VALIDACION_PENDIENTE: ShieldEllipsis, CASO_SIN_ATENDER: Clock };

export default async function Notificaciones() {
  const sesion = await requireSession('/notificaciones');
  const servicio = new NotificacionService();
  const [avisos, noLeidas] = await Promise.all([servicio.listar(sesion.id), servicio.contarNoLeidas(sesion.id)]);
  const clave = clavePublicaPush();

  return <section className="avisos">
    <Refrescar segundos={30} />
    <header className="pagina-cabecera avisos-cabecera">
      <span><h1>Avisos</h1><p className="muted">{noLeidas ? `${noLeidas} sin leer` : 'Estás al día'}</p></span>
      {noLeidas > 0 && <form action={marcarTodasAction}><button className="button button-chico button-secondary"><CheckCheck aria-hidden="true" size={18} />Marcar todo como leído</button></form>}
    </header>

    {avisos.length
      ? <ul className="lista-avisos">{avisos.map((a, i) => {
        const Icono = ICONO[a.tipo];
        return <li key={a.id} style={{ '--i': Math.min(i, 6) } as React.CSSProperties}>
          <AvisoItem id={a.id} enlace={a.enlace} leida={!!a.leidaEn}>
            <span className={`aviso-icono aviso-${a.tipo.toLowerCase().replace(/_/g, '-')}`} aria-hidden="true"><Icono size={20} /></span>
            <span className="aviso-texto">
              <strong>{a.titulo}</strong>
              <span>{a.cuerpo}</span>
              <span className="muted">{haceCuanto(a.creadoEn)}</span>
            </span>
            {!a.leidaEn && <span className="aviso-punto"><span className="sr-only">Sin leer</span></span>}
          </AvisoItem>
        </li>;
      })}</ul>
      : <div className="vacio"><h2>No tenés avisos</h2><p>Acá te avisamos de los casos rojos nuevos y, si coordinás, de la cola y los casos que nadie toma.</p></div>}

    {clave && <ActivarPush clavePublica={clave} />}
  </section>;
}
