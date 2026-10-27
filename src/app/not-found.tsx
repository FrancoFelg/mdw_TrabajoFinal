import Link from "next/link";

export default function NotFound() {
  return (
    <section className="stack">
      <p className="eyebrow">Error 404</p>
      <h1>Página no encontrada</h1>
      <p>La dirección no existe o dejó de estar disponible.</p>
      <div><Link className="button" href="/">Volver al inicio</Link></div>
    </section>
  );
}
