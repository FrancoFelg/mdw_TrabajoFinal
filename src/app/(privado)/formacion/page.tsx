import Link from 'next/link';
import { ChevronRight, FileText } from 'lucide-react';
import { CertificadoService } from '../../../../services/certificado.service';
import { CursoService } from '../../../../services/curso.service';
import { requireSession } from '@/lib/session';
import { esCoordinador, estadoHabilitacion, fechaCorta, fechaDia } from '@/lib/casos';
import { Habilitacion, MarcaRevision } from '@/components/marcas';
import { CargarCertificado, CrearCurso } from '@/components/formacion-forms';

export const metadata = { title: 'Formación | Red de Apoyo' };

export default async function Formacion() {
  const sesion = await requireSession('/formacion');
  const coordinador = esCoordinador(sesion.rol);
  const [certificados, cursos] = await Promise.all([new CertificadoService().listarCertificados(), new CursoService().listar()]);
  const mios = certificados.filter(c => c.usuarioId === sesion.id).sort((a, b) => b.fechaCreacion.getTime() - a.fechaCreacion.getTime());
  const estado = estadoHabilitacion(mios);
  const porValidar = coordinador ? certificados.filter(c => c.estado === 'PENDIENTE' && c.usuarioId !== sesion.id).length : 0;

  return <section className="formacion">
    <header className="pagina-cabecera"><h1>Formación</h1></header>

    {porValidar > 0 && <Link href="/equipo" className="enlace-fila enlace-destacado">
      <span><strong>{porValidar} certificado{porValidar > 1 ? 's' : ''} por validar</strong><span className="muted">Revisalos en Equipo</span></span>
      <ChevronRight aria-hidden="true" size={20} />
    </Link>}

    <section className="bloque" aria-labelledby="mis-certificados">
      <h2 id="mis-certificados">Tus certificados</h2>
      <Habilitacion estado={estado} enlace={false} />
      {mios.length > 0 && <ul className="lista-simple">{mios.map(c => <li key={c.id} className="certificado">
        <span className="certificado-datos">
          <strong>{c.curso?.titulo ?? 'Capacitación externa'}</strong>
          <span className="muted">Código {c.codigoVerificacion} · {fechaCorta(c.fechaCreacion)}</span>
          {c.archivoMime && <a className="text-link archivo-enlace" href={`/api/certificados/${c.id}/archivo`} target="_blank" rel="noopener noreferrer"><FileText aria-hidden="true" size={16} />Ver archivo<span className="sr-only"> (se abre en otra pestaña)</span></a>}
          {c.estado === 'RECHAZADO' && c.motivoRechazo && <span className="motivo"><strong>Motivo:</strong> {c.motivoRechazo}</span>}
        </span>
        <MarcaRevision estado={c.estado} />
      </li>)}</ul>}
      <CargarCertificado cursos={cursos.map(c => ({ id: c.id, titulo: c.titulo }))} abierto={estado === 'sin' || estado === 'rechazado'} />
    </section>

    <section className="bloque" aria-labelledby="cursos">
      <h2 id="cursos">Cursos</h2>
      {cursos.length
        ? <ul className="lista-simple lista-cursos">{cursos.map(c => <li key={c.id}>
          <span><strong>{c.titulo}</strong><span className="muted">{c.descripcion}</span></span>
          <span className="muted fechas">{fechaDia(c.fechaDesde)} – {fechaDia(c.fechaHasta)}</span>
        </li>)}</ul>
        : <div className="vacio vacio-chico"><h3>Todavía no hay cursos</h3><p>{coordinador ? 'Creá el primero con el formulario de abajo.' : 'Cuando coordinación cargue cursos, aparecen acá.'}</p></div>}
      {coordinador && <CrearCurso />}
    </section>
  </section>;
}
