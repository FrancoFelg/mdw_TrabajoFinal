import { ReporteForm, LlamarAhora } from '@/components/reporte-form';

export default function Inicio() {
  return <div className="inicio">
    <header className="inicio-cabecera">
      <h1>Reportá una emergencia</h1>
      <p className="lead">Si ves a una persona en la calle que necesita ayuda, avisá acá. Un voluntario de la red toma el caso y va al lugar.</p>
      <LlamarAhora />
    </header>
    <ReporteForm />
  </div>;
}
