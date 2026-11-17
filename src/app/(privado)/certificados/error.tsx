'use client';

import { Alert } from '@/components/ui';

export default function ErrorCertificados({ reset }: { reset: () => void }) {
  return <section className="stack"><h1>Mis certificados</h1><Alert><h2>No pudimos cargar tus certificados</h2><p>Puede ser la conexión o el servidor. Probá de nuevo en unos segundos.</p></Alert><button className="button" onClick={reset}>Reintentar</button></section>;
}
