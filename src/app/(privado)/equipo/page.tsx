import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { SolicitudAscensoService } from '../../../../services/solicitudAscenso.service';
import { CertificadoService } from '../../../../services/certificado.service';
import { requireSession } from '@/lib/session';
import { esCoordinador, fechaCorta } from '@/lib/casos';
import { MarcaRevision } from '@/components/marcas';
import { ColaValidacion } from '@/components/cola-validacion';

export const metadata = { title: 'Equipo | Red de Apoyo' };

export default async function Equipo() {
  const sesion = await requireSession('/equipo');
  if (!esCoordinador(sesion.rol)) {
    return <section className="vacio" role="status"><h1>Acceso restringido</h1><p>Esta sección es para coordinadores y administradores.</p><Link className="button button-secondary" href="/casos">Volver a casos</Link></section>;
  }
  const [solicitudes, certificados] = await Promise.all([new SolicitudAscensoService().listar(), new CertificadoService().listarCertificados()]);

  // Nadie valida su propio certificado: no aparece en la cola (también lo bloquea el servicio).
  const porValidar = certificados
    .filter(c => c.estado === 'PENDIENTE' && c.usuarioId !== sesion.id)
    .sort((a, b) => a.fechaCreacion.getTime() - b.fechaCreacion.getTime())
    .map(c => ({
      id: c.id,
      persona: `${c.usuario.persona.nombre} ${c.usuario.persona.apellido}`,
      usuario: c.usuario.nombreUsuario,
      curso: c.curso?.titulo ?? null,
      codigo: c.codigoVerificacion,
      cargado: fechaCorta(c.fechaCreacion),
      archivo: c.archivoMime ? (c.archivoMime === 'application/pdf' ? 'pdf' as const : 'imagen' as const) : null,
    }));

  const ascensos = solicitudes.filter(s => s.estado === 'PENDIENTE' && s.usuarioId !== sesion.id).reverse().map(s => {
    const suyos = certificados.filter(c => c.usuarioId === s.usuarioId);
    return {
      id: s.id,
      persona: `${s.usuario.persona.nombre} ${s.usuario.persona.apellido}`,
      usuario: s.usuario.nombreUsuario,
      pedido: fechaCorta(s.creadoEn),
      aprobados: suyos.filter(c => c.estado === 'APROBADO').length,
      pendientes: suyos.filter(c => c.estado === 'PENDIENTE').length,
    };
  });
  const respondidas = solicitudes.filter(s => s.estado !== 'PENDIENTE').slice(0, 10);

  return <section className="equipo">
    <header className="pagina-cabecera"><h1>Equipo</h1><p className="muted">Validá certificados y respondé pedidos de ascenso.</p></header>

    <ColaValidacion certificados={porValidar} ascensos={ascensos} />

    {respondidas.length > 0 && <section className="bloque" aria-labelledby="respondidas">
      <h2 id="respondidas">Ascensos respondidos</h2>
      <ul className="lista-simple">{respondidas.map(s => <li key={s.id}><span><strong>{s.usuario.persona.nombre} {s.usuario.persona.apellido}</strong><span className="muted">@{s.usuario.nombreUsuario} · {fechaCorta(s.creadoEn)}</span></span><MarcaRevision estado={s.estado} /></li>)}</ul>
    </section>}

    <Link href="/usuarios" className="enlace-fila"><span><strong>Directorio de usuarios</strong><span className="muted">Todas las personas de la red y su rol</span></span><ChevronRight aria-hidden="true" size={20} /></Link>
  </section>;
}
