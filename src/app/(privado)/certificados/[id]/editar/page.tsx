import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/session';
import { aVista, editable } from '@/lib/certificados-vista';
import { CertificadoForm } from '@/components/certificado-form';
import { SinDatos } from '@/components/sin-datos';
import { CertificadoService } from '../../../../../../services/certificado.service';
import { CertificadoAtributoRepository } from '../../../../../../repositories/certificadoAtributo.repository';

export const metadata = { title: 'Editar certificado | Red de Apoyo' };

export default async function EditarCertificado({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sesion = await requireSession('/certificados');
  const certificado = await new CertificadoService().obtener(id, { id: sesion.id, rol: sesion.rol }).catch(() => null);
  // Solo el dueño edita: coordinación tampoco ve el formulario de un certificado ajeno.
  if (!certificado || certificado.usuarioId !== sesion.id) notFound();
  const catalogo = await new CertificadoAtributoRepository().findAll();

  return <section className="stack">
    <header className="pagina-cabecera"><h1>Editar certificado</h1></header>
    {editable(certificado.estado)
      ? <>
        {certificado.estado === 'RECHAZADO' && <p className="aviso">Al guardar, el certificado vuelve a revisión.{certificado.motivoRechazo && ` Motivo del rechazo: ${certificado.motivoRechazo}`}</p>}
        <CertificadoForm modo="editar" inicial={aVista(certificado)} catalogo={catalogo.map(a => ({ id: a.id, nombre: a.nombre, tipo: a.tipo }))} />
      </>
      : <SinDatos titulo="Este certificado ya está aprobado.">
        <p>Un certificado aprobado no se puede editar. Si tus datos cambiaron, dalo de baja y cargá uno nuevo.</p>
        <div className="actions"><Link className="button button-chico button-secondary" href="/certificados">Volver a mis certificados</Link></div>
      </SinDatos>}
  </section>;
}
