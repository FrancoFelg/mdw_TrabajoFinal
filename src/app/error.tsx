"use client";

// Error boundary del segmento raíz — debe ser client component
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <h2>Algo salió mal</h2>
      <button onClick={() => reset()}>Reintentar</button>
    </main>
  );
}
