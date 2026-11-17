import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { esCoordinacionVigente } from '@/lib/actor-actual';
import { aVistaCurso } from '@/lib/cursos-vista';
import { CursoForm } from '@/components/curso-form';
import { CursoRepository } from '../../../../../../repositories/curso.repository';
import { CursoAtributoRepository } from '../../../../../../repositories/cursoAtributo.repository';

export const metadata = { title: 'Editar curso | Red de Apoyo' };

export default async function EditarCurso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await requireSession('/cursos');
  if (!(await esCoordinacionVigente(sesion.id))) {
    return <section className="stack"><h1>Editar curso</h1><p className="alert" role="alert">Solo coordinación puede editar cursos.</p></section>;
  }
  const [curso, catalogo] = await Promise.all([new CursoRepository().findById(id), new CursoAtributoRepository().findAll()]);
  if (!curso) notFound();
  return <section className="stack">
    <header className="pagina-cabecera"><h1>Editar curso</h1></header>
    <CursoForm inicial={aVistaCurso(curso)} catalogo={catalogo.map(a => ({ id: a.id, nombre: a.nombre, tipo: a.tipo }))} />
  </section>;
}
