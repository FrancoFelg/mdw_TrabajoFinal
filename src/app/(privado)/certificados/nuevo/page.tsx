import Link from 'next/link';
import { requireSession } from '@/lib/session';
import { CertificadoForm, type DatosDelCurso } from '@/components/certificado-form';
import { SinDatos } from '@/components/sin-datos';
import { fechaCurso, otorgaCertificado, terminado } from '@/lib/cursos-vista';
import { CertificadoAtributoRepository } from '../../../../../repositories/certificadoAtributo.repository';
import { CursoRepository } from '../../../../../repositories/curso.repository';
import { db } from '../../../../../config/database';

export const metadata = { title: 'Cargar certificado | Red de Apoyo' };

// Con `?cursoId=` la persona solo sube el archivo: nombre, entidad y fecha salen del curso.
// La API vuelve a validar todo; acá solo se explica antes de mostrar un formulario que fallaría.
async function cursoParaCargar(cursoId: string, usuarioId: string): Promise<DatosDelCurso | string> {
  const curso = await new CursoRepository().findById(cursoId);
  if (!curso) return 'Ese curso no existe o fue dado de baja.';
  if (!otorgaCertificado(curso)) return `«${curso.titulo}» no otorga certificado. Podés cargar tu certificado con sus datos.`;
  const fin = curso.fechaHasta.toISOString();
  if (!terminado({ fechaHasta: fin })) return `Vas a poder cargar el certificado de «${curso.titulo}» cuando termine el curso, el ${fechaCurso(fin)}.`;
  const activo = await db.certificado.findFirst({
    where: { usuarioId, cursoId, fechaEliminacion: null, estado: { in: ['PENDIENTE', 'APROBADO'] } },
    select: { id: true },
  });
  if (activo) return `Ya cargaste tu certificado de «${curso.titulo}». Lo encontrás en Mis certificados.`;
  return { id: curso.id, titulo: curso.titulo, nombre: curso.certificadoNombre!, entidadEmisora: curso.certificadoEmisor!, fechaEmision: `${fin.slice(0, 10)}T12:00:00.000Z` };
}

export default async function NuevoCertificado({ searchParams }: { searchParams: Promise<{ cursoId?: string | string[] }> }) {
  const sesion = await requireSession('/certificados');
  const { cursoId } = await searchParams;
  const curso = typeof cursoId === 'string' && cursoId ? await cursoParaCargar(cursoId, sesion.id) : undefined;
  const catalogo = await new CertificadoAtributoRepository().findAll();

  return <section className="stack">
    <header className="pagina-cabecera">
      <h1>Cargar certificado</h1>
      <p className="muted">Coordinación lo revisa. Mientras esté pendiente no habilita casos rojos.</p>
    </header>
    {typeof curso === 'string'
      ? <SinDatos titulo="No se puede cargar este certificado">
        <p>{curso}</p>
        <div className="actions">
          <Link className="button button-chico button-secondary" href="/cursos">Volver a cursos</Link>
          <Link className="button button-chico button-secondary" href="/certificados">Mis certificados</Link>
        </div>
      </SinDatos>
      : <>
        {!curso && <p className="muted">¿Es de un curso del catálogo? <Link href="/cursos">Elegilo en Cursos</Link> y solo subís el archivo.</p>}
        <CertificadoForm modo="crear" curso={curso} catalogo={catalogo.map(a => ({ id: a.id, nombre: a.nombre, tipo: a.tipo }))} />
      </>}
  </section>;
}
