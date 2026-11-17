import { Provincia } from '@prisma/client';
import { ReporteForm } from '@/components/reporte-form';
import { LlamarEmergencias } from '@/components/llamar-emergencias';

export default function ReportarPage() {
  return <section className="reporte stack">
    <div><p className="eyebrow">Asistencia comunitaria</p><h1>Reportá una emergencia</h1>
      <p className="muted">No necesitás cuenta. Contanos qué pasó y dónde hace falta ayuda.</p></div>
    <LlamarEmergencias />
    <ReporteForm provincias={Object.values(Provincia)} />
  </section>;
}
