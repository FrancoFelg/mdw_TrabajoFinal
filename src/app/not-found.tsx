import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h2>Página no encontrada</h2>
      <Link href="/">Volver al inicio</Link>
    </main>
  );
}
