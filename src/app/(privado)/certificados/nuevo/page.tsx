import { requireSession } from '@/lib/session';
import { CertificadoForm } from '@/components/certificado-form';
import { CertificadoAtributoRepository } from '../../../../../repositories/certificadoAtributo.repository';

export const metadata = { title: 'Cargar certificado | Red de Apoyo' };

export default async function NuevoCertificado() {
  await requireSession('/certificados');
  const catalogo = await new CertificadoAtributoRepository().findAll();
  return <section className="stack">
    <header className="pagina-cabecera">
      <h1>Cargar certificado</h1>
      <p className="muted">Coordinación lo revisa. Mientras esté pendiente no habilita casos rojos.</p>
    </header>
    <CertificadoForm modo="crear" catalogo={catalogo.map(a => ({ id: a.id, nombre: a.nombre, tipo: a.tipo }))} />
  </section>;
}
