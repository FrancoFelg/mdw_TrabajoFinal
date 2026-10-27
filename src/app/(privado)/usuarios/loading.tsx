import { Card, Skeleton } from '@/components/ui';

export default function Loading() {
  return <section className="stack" role="status" aria-label="Cargando usuarios"><h1>Usuarios</h1><Card><Skeleton /><Skeleton /></Card><Card>{[1, 2, 3, 4].map(n => <Skeleton key={n} />)}</Card><span className="sr-only">Cargando directorio de usuarios…</span></section>;
}
