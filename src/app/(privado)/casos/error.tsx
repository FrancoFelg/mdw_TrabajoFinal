'use client';

import { Alert } from '@/components/ui';

export default function ErrorCasos({ reset }: { reset: () => void }) {
  return <section className="stack"><h1>Casos</h1><Alert><h2>No pudimos cargar los casos</h2><p>Puede ser la conexión o el servidor. Probá de nuevo en unos segundos.</p></Alert><button className="button" onClick={reset}>Reintentar</button></section>;
}
