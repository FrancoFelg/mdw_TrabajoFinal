import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { EmergenciaService } from '../../../../../services/emergencia.service';
import { EmergenciaRepository } from '../../../../../repositories/emergencia.repository';
import { requireSession } from '@/lib/session';
import { haceCuanto, horaCorta, NOMBRES_PROVINCIA, codigoCaso } from '@/lib/casos';
import { Asignado, CodigoCaso, EtapasCaso, MarcaEstado, MarcaPrioridad } from '@/components/marcas';
import { CasoAcciones } from '@/components/caso-acciones';
import { DistanciaCaso, MapaCaso } from '@/components/mapa-caso';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: `Caso #${codigoCaso((await params).id)} | Red de Apoyo` };
}

export default async function Caso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await requireSession(`/casos/${id}`);
  const emergencia = await new EmergenciaService().obtenerPorId(id).catch(() => null);
  if (!emergencia) notFound();

  const repo = new EmergenciaRepository();
  const [activa, certificado] = await Promise.all([
    repo.findActivaByVoluntario(sesion.id),
    repo.tieneCertificadoAprobado(sesion.id),
  ]);

  const asignado = emergencia.usuarios[0]?.usuario;
  const nombreAsignado = asignado ? `${asignado.persona.nombre} ${asignado.persona.apellido}` : null;
  const propio = asignado?.id === sesion.id;
  const { coordenada_x: lng, coordenada_y: lat, provincia } = emergencia.ubicacion;

  let bloqueo: { texto: string; enlace?: { href: string; texto: string } } | null = null;
  if (emergencia.estado === 'SIN_GESTIONAR') {
    if (activa) bloqueo = { texto: 'Ya tenés un caso en camino. Finalizalo antes de tomar otro.', enlace: { href: `/casos/${activa.id}`, texto: `Ir a tu caso #${codigoCaso(activa.id)}` } };
    else if (emergencia.prioridad === 'ROJO' && !certificado) bloqueo = { texto: 'Los casos rojos los toma quien tiene un certificado aprobado.', enlace: { href: '/formacion', texto: 'Cargar un certificado' } };
  }

  const conMapa = lat !== null && lng !== null;
  return <article className={conMapa ? 'caso caso-con-mapa' : 'caso'}>
    {conMapa && <div className="caso-mapa">
      <MapaCaso lat={lat} lng={lng} prioridad={emergencia.prioridad} id={emergencia.id} estado={emergencia.estado} />
    </div>}
    <Link href="/casos" className="volver" aria-label="Volver a casos"><ArrowLeft aria-hidden="true" size={22} /><span className="volver-texto">Casos</span></Link>

    <div className="hoja caso-hoja">
      <header className="caso-cabecera">
        <div className="caso-marcas"><MarcaPrioridad prioridad={emergencia.prioridad} detalle /><MarcaEstado estado={emergencia.estado} /></div>
        <h1 className="caso-desc">{emergencia.descripcion}</h1>
        <p className="muted"><CodigoCaso id={emergencia.id} /> Reportado {haceCuanto(emergencia.fecha)} · {horaCorta(emergencia.fecha)}</p>
      </header>

      <EtapasCaso estado={emergencia.estado} detalles={{ SIN_GESTIONAR: haceCuanto(emergencia.fecha), EN_CAMINO: nombreAsignado ? (propio ? 'Vos' : nombreAsignado) : undefined }} />

      <section className="grupo" aria-label="Detalles del caso">
        <div className="grupo-fila">
          <span className="grupo-etiqueta">Quién lo atiende</span>
          <Asignado nombre={nombreAsignado} propio={propio} />
        </div>
        <div className="grupo-fila">
          <span className="grupo-etiqueta">Dónde</span>
          <span className="grupo-valor">{NOMBRES_PROVINCIA[provincia]}{conMapa && <span className="coordenadas"> · {lat.toFixed(5)}, {lng.toFixed(5)}</span>}</span>
        </div>
        {conMapa && <DistanciaCaso lat={lat} lng={lng} />}
        {conMapa && <a className="grupo-fila grupo-enlace" href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
          <span className="grupo-etiqueta">Cómo llegar</span>
          <span className="grupo-valor">Abrir en Google Maps<ExternalLink aria-hidden="true" size={16} /><span className="sr-only"> (se abre en otra pestaña)</span></span>
        </a>}
      </section>

      <CasoAcciones id={emergencia.id} estado={emergencia.estado} propio={propio} asignado={nombreAsignado} bloqueo={bloqueo} />
    </div>
  </article>;
}
