'use client';

import { Alert, Button } from '@/components/ui';

export default function ErrorUsuarios({ reset }: { reset: () => void }) {
  return <section className="stack"><h1>Usuarios</h1><Alert><h2>No pudimos cargar el directorio</h2><p>Ocurrió un problema al consultar los usuarios. Intentá nuevamente.</p></Alert><Button onClick={reset}>Reintentar</Button></section>;
}
