import { Skeleton } from '@/components/ui';

export default function Loading() {
  return <section className="stack" role="status" aria-label="Cargando cursos">
    <header className="pagina-cabecera"><h1>Cursos</h1></header>
    <div className="stack-chico">{[1, 2, 3].map(n => <Skeleton key={n} />)}</div>
    <span className="sr-only">Cargando cursos…</span>
  </section>;
}
