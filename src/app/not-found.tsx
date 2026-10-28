import Link from "next/link";

export default function NotFound() {
  return (
    <section className="stack">
      <h1>Página no encontrada</h1>
      <p>La dirección no existe o dejó de estar disponible.</p>
      <div><Link className="button" href="/">Ir a reportar una emergencia</Link></div>
    </section>
  );
}
