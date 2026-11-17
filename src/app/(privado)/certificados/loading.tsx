import { Skeleton } from '@/components/ui';

export default function Loading() {
  return <section className="stack" role="status" aria-label="Cargando certificados">
    <header className="pagina-cabecera"><h1>Mis certificados</h1></header>
    <div className="stack-chico">{[1, 2, 3].map(n => <Skeleton key={n} />)}</div>
    <span className="sr-only">Cargando certificados…</span>
  </section>;
}
