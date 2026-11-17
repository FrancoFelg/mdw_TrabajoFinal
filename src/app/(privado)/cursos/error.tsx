'use client';

import { Alert } from '@/components/ui';

export default function ErrorCursos({ reset }: { reset: () => void }) {
  return <section className="stack"><h1>Cursos</h1><Alert><h2>No pudimos cargar los cursos</h2><p>Puede ser la conexión o el servidor. Probá de nuevo en unos segundos.</p></Alert><button className="button" onClick={reset}>Reintentar</button></section>;
}
