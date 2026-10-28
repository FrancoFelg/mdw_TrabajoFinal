import { Skeleton } from '@/components/ui';

export default function Loading() {
  return <section className="stack" role="status" aria-label="Cargando">
    <Skeleton /><Skeleton /><Skeleton />
    <span className="sr-only">Cargando…</span>
  </section>;
}
