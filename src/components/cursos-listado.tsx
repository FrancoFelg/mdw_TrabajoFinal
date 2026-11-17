'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Upload } from 'lucide-react';
import type { CertificadoEstado } from '@prisma/client';
import { Button, Card } from './ui';
import { MarcaRevision } from './marcas';
import { darDeBajaCursoAction } from '@/app/actions/formacion';
import { valorAtributo } from '@/lib/certificados-vista';
import { fechaCurso, otorgaCertificado, terminado, type CursoVista } from '@/lib/cursos-vista';

// `mios`: estado del certificado activo (pendiente o aprobado) de la persona para cada curso.
export function CursosListado({ cursos, coordinacion, mios }: { cursos: CursoVista[]; coordinacion: boolean; mios: Record<string, CertificadoEstado> }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function darDeBaja(c: CursoVista) {
    if (ocupado || !window.confirm(`¿Dar de baja "${c.titulo}"? Los certificados ya cargados no cambian.`)) return;
    setOcupado(c.id);
    setError('');
    try {
      const resultado = await darDeBajaCursoAction(c.id);
      if (resultado.ok) router.refresh();
      else setError(resultado.error || 'No pudimos dar de baja el curso.');
    } catch {
      setError('No pudimos confirmar la baja. Actualizá la página antes de reintentar.');
    } finally {
      setOcupado(null);
    }
  }

  return <div className="stack" aria-busy={ocupado !== null}>
    {error && <p className="alert" role="alert">{error}</p>}
    {cursos.map(c => {
      const mio = mios[c.id];
      return <Card key={c.id} role="article" aria-label={`Curso ${c.titulo}`}>
        <div className="certificado-cabecera"><h2>{c.titulo}</h2>{mio && <MarcaRevision estado={mio} />}</div>
        <p>{c.descripcion}</p>
        <dl className="datos">
          <div><dt>Fechas</dt><dd>Del {fechaCurso(c.fechaDesde)} al {fechaCurso(c.fechaHasta)}</dd></div>
          {c.horas !== null && <div><dt>Horas</dt><dd>{c.horas}</dd></div>}
          <div><dt>Certificado</dt><dd>{otorgaCertificado(c) ? `${c.certificadoNombre} · ${c.certificadoEmisor}` : 'No otorga certificado'}</dd></div>
          {c.atributos.map(a => <div key={a.campoId}><dt>{a.nombre}</dt><dd>{valorAtributo(a.tipo, a.dato)}</dd></div>)}
        </dl>
        {otorgaCertificado(c) && (mio
          ? <p className="muted">Ya cargaste tu certificado de este curso. <Link href="/certificados">Ver mis certificados</Link></p>
          : !terminado(c) && <p className="muted">Vas a poder cargar el certificado cuando termine el curso, el {fechaCurso(c.fechaHasta)}.</p>)}
        <div className="actions">
          {otorgaCertificado(c) && !mio && terminado(c) && <Link className="button button-chico" href={`/certificados/nuevo?cursoId=${c.id}`}>
            <Upload aria-hidden="true" size={18} />Cargar mi certificado<span className="sr-only"> de {c.titulo}</span>
          </Link>}
          {coordinacion && <>
            <Link className="button button-chico button-secondary" href={`/cursos/${c.id}/editar`}>
              <Pencil aria-hidden="true" size={18} />Editar<span className="sr-only"> {c.titulo}</span>
            </Link>
            <Button className="button-chico button-peligro" disabled={ocupado !== null} onClick={() => darDeBaja(c)}>
              <Trash2 aria-hidden="true" size={18} />{ocupado === c.id ? 'Dando de baja…' : 'Dar de baja'}<span className="sr-only"> {c.titulo}</span>
            </Button>
          </>}
        </div>
      </Card>;
    })}
  </div>;
}
