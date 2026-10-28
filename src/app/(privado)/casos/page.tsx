import { EmergenciaService } from '../../../../services/emergencia.service';
import { requireSession } from '@/lib/session';
import { ORDEN_PRIORIDAD, haceCuanto, NOMBRES_PROVINCIA } from '@/lib/casos';
import { CasosVista, type CasoFila } from '@/components/casos-vista';
import { Refrescar } from '@/components/refrescar';

export const metadata = { title: 'Casos | Red de Apoyo' };

export default async function Casos() {
  const sesion = await requireSession('/casos');
  const emergencias = await new EmergenciaService().listarEmergencias();
  const activos: CasoFila[] = emergencias
    .filter(e => e.estado === 'SIN_GESTIONAR' || e.estado === 'EN_CAMINO')
    .map(e => {
      const asignado = e.usuarios[0]?.usuario;
      return {
        id: e.id,
        descripcion: e.descripcion,
        prioridad: e.prioridad,
        estado: e.estado,
        hace: haceCuanto(e.fecha),
        fecha: e.fecha.toISOString(),
        provincia: NOMBRES_PROVINCIA[e.ubicacion.provincia],
        lat: e.ubicacion.coordenada_y,
        lng: e.ubicacion.coordenada_x,
        asignado: asignado ? `${asignado.persona.nombre} ${asignado.persona.apellido.charAt(0)}.` : null,
        propio: asignado?.id === sesion.id,
        foto: e.adjuntos.some(a => a.tipo === 'IMAGEN'),
        audio: e.adjuntos.some(a => a.tipo === 'AUDIO'),
      };
    })
    .sort((a, b) => ORDEN_PRIORIDAD[a.prioridad] - ORDEN_PRIORIDAD[b.prioridad] || b.fecha.localeCompare(a.fecha));

  const mio = activos.find(c => c.propio && c.estado === 'EN_CAMINO');

  return <section className="casos">
    <Refrescar segundos={30} />
    <CasosVista casos={activos} mio={mio ?? null} />
  </section>;
}
