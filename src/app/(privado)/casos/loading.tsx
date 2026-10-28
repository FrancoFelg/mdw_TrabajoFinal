import { Skeleton } from '@/components/ui';

export default function Loading() {
  return <section className="casos" role="status" aria-label="Cargando casos">
    <header className="pagina-cabecera"><h1>Casos</h1></header>
    <div className="stack-chico">{[1, 2, 3, 4].map(n => <Skeleton key={n} />)}</div>
    <span className="sr-only">Cargando casos…</span>
  </section>;
}
