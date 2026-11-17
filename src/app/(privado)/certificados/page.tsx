import Link from 'next/link';
import { Plus, ShieldAlert, ShieldCheck } from 'lucide-react';
import { requireSession } from '@/lib/session';
import { aVista } from '@/lib/certificados-vista';
import { CertificadosListado } from '@/components/certificados-listado';
import { SinDatos } from '@/components/sin-datos';
import { FormacionPestanas } from '@/components/formacion-pestanas';
import { esCoordinacionVigente } from '@/lib/actor-actual';
import { CertificadoService } from '../../../../services/certificado.service';
import { EmergenciaRepository } from '../../../../repositories/emergencia.repository';

export const metadata = { title: 'Mis certificados | Red de Apoyo' };

export default async function Certificados() {
  const sesion = await requireSession('/certificados');
  const quien = { id: sesion.id, rol: sesion.rol };
  // Siempre los propios, también para coordinación (la cola de revisión es otra pantalla).
  const [certificados, habilitado, coordinacion] = await Promise.all([
    new CertificadoService().listar({ usuarioId: sesion.id }, quien),
    new EmergenciaRepository().tieneCertificadoAprobado(sesion.id),
    esCoordinacionVigente(sesion.id),
  ]);
  const cargar = <Link className="button button-chico" href="/certificados/nuevo"><Plus aria-hidden="true" size={18} />Cargar certificado</Link>;

  return <section className="stack">
    <FormacionPestanas actual="certificados" coordinacion={coordinacion} />
    <header className="pagina-cabecera">
      <h1>Mis certificados</h1>
      <p className="muted">Tus capacitaciones. Coordinación revisa cada certificado antes de darlo por válido.</p>
      <div className="actions">{cargar}</div>
    </header>
    <p role="status" className={habilitado ? 'exito' : 'aviso'}>
      {habilitado
        ? <><ShieldCheck aria-hidden="true" size={18} />Podés tomar casos rojos.</>
        : <><ShieldAlert aria-hidden="true" size={18} />Necesitás un certificado aprobado para tomar casos rojos.</>}
    </p>
    {certificados.length
      ? <CertificadosListado certificados={certificados.map(aVista)} />
      : <SinDatos titulo="Todavía no cargaste certificados."><p>Cargá el PDF o una foto de tu certificado para que coordinación lo revise.</p><div className="actions">{cargar}</div></SinDatos>}
  </section>;
}
