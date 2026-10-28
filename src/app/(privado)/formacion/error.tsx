'use client';

import { Alert } from '@/components/ui';

export default function ErrorSeccion({ reset }: { reset: () => void }) {
  return <section className="stack"><Alert><h2>No pudimos cargar esta sección</h2><p>Puede ser la conexión o el servidor. Probá de nuevo en unos segundos.</p></Alert><button className="button" onClick={reset}>Reintentar</button></section>;
}
