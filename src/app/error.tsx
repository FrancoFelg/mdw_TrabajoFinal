"use client";

import { Alert, Button } from '@/components/ui';

// Error boundary del segmento raíz — debe ser client component
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="stack">
      <Alert><h1>Algo salió mal</h1><p>No pudimos cargar esta pantalla. Intentá nuevamente.</p></Alert>
      <Button onClick={() => reset()}>Reintentar</Button>
    </section>
  );
}
