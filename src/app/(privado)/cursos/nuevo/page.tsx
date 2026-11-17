import { requireSession } from '@/lib/session';
import { esCoordinacionVigente } from '@/lib/actor-actual';
import { CursoForm } from '@/components/curso-form';
import { CursoAtributoRepository } from '../../../../../repositories/cursoAtributo.repository';

export const metadata = { title: 'Nuevo curso | Red de Apoyo' };

export default async function NuevoCurso() {
  const sesion = await requireSession('/cursos');
  if (!(await esCoordinacionVigente(sesion.id))) {
    return <section className="stack"><h1>Nuevo curso</h1><p className="alert" role="alert">Solo coordinación puede crear cursos.</p></section>;
  }
  const catalogo = await new CursoAtributoRepository().findAll();
  return <section className="stack">
    <header className="pagina-cabecera"><h1>Nuevo curso</h1></header>
    <CursoForm catalogo={catalogo.map(a => ({ id: a.id, nombre: a.nombre, tipo: a.tipo }))} />
  </section>;
}
