'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Button, Card } from './ui';
import { Formulario } from './formulario';
import { MarcaRevision } from './marcas';
import { revisarCertificadoAction } from '@/app/actions/formacion';
import { fechaLegible } from '@/lib/certificados-vista';

export type CertificadoRevision = {
  id: string; nombre: string; entidadEmisora: string; fechaEmision: string; codigoVerificacion: string | null;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'; motivoRechazo: string | null; persona: string; curso: string | null;
  // Es de quien está revisando: lo revisa otra persona de coordinación.
  propio: boolean;
};

// Aprobar habilita a la persona a tomar casos rojos, así que ninguna decisión viene elegida de
// antemano: primero se elige Aprobar o Rechazar y después se confirma. El motivo solo se pide
// al rechazar.
function Decision({ certificado: c, onGuardado, onEnviar }: {
  certificado: CertificadoRevision; onGuardado: () => void; onEnviar: () => void;
}) {
  const [decision, setDecision] = useState<'APROBADO' | 'RECHAZADO' | null>(null);
  if (!decision) return <div className="actions">
    <Button type="button" onClick={() => setDecision('APROBADO')}>Aprobar</Button>
    <Button type="button" className="button-secondary" onClick={() => setDecision('RECHAZADO')}>Rechazar</Button>
  </div>;
  const aprobar = decision === 'APROBADO';
  return <Formulario id={`revisar-${c.id}`} className="stack-chico"
    action={datos => { onEnviar(); return revisarCertificadoAction(c.id, datos); }} onSuccess={onGuardado}>
    <input type="hidden" name="estado" value={decision} />
    {aprobar
      ? <p>Al aprobarlo, {c.persona} podrá tomar casos rojos.</p>
      : <div className="field"><label htmlFor={`motivo-${c.id}`}>Motivo del rechazo</label>
        <textarea id={`motivo-${c.id}`} name="motivo" className="input textarea" maxLength={2000} autoFocus /></div>}
    <div className="actions">
      <Button type="submit">{aprobar ? 'Confirmar aprobación' : 'Confirmar rechazo'}</Button>
      <Button type="button" className="button-secondary" onClick={() => setDecision(null)}>Cancelar</Button>
    </div>
  </Formulario>;
}

// Cola de validación (historia 6): pendientes primero, luego el historial resuelto.
export function RevisionCertificados({ certificados }: { certificados: CertificadoRevision[] }) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState('');

  const pendientes = certificados.filter(c => c.estado === 'PENDIENTE');
  const resueltos = certificados.filter(c => c.estado !== 'PENDIENTE');
  const tarjeta = (c: CertificadoRevision) => <Card key={c.id} role="article" aria-label={`Certificado ${c.nombre} de ${c.persona}`}>
    <div className="certificado-cabecera"><h3>{c.nombre}</h3><MarcaRevision estado={c.estado} /></div>
    <dl className="datos">
      <div><dt>Persona</dt><dd>{c.persona}</dd></div>
      <div><dt>Entidad emisora</dt><dd>{c.entidadEmisora}</dd></div>
      <div><dt>Emitido</dt><dd>{fechaLegible(c.fechaEmision)}</dd></div>
      <div><dt>Curso</dt><dd>{c.curso ?? 'Sin curso'}</dd></div>
      {c.codigoVerificacion && <div><dt>Número</dt><dd>{c.codigoVerificacion}</dd></div>}
    </dl>
    {c.motivoRechazo && <p className="aviso">Motivo: {c.motivoRechazo}</p>}
    <div className="actions"><a className="button button-chico button-secondary" href={`/api/certificados/${c.id}/archivo`} target="_blank" rel="noopener"><FileText aria-hidden="true" size={18} />Ver archivo<span className="sr-only"> (se abre en otra pestaña)</span></a></div>
    {c.estado === 'PENDIENTE' && c.propio && <p className="muted">Es tu certificado: lo revisa otra persona de coordinación.</p>}
    {c.estado === 'PENDIENTE' && !c.propio && <Decision certificado={c}
      onGuardado={() => { setMensaje('Validación guardada.'); router.refresh(); }} onEnviar={() => setMensaje('')} />}
  </Card>;

  return <div className="stack">
    <p role="status">{mensaje}</p>
    <h2>Pendientes ({pendientes.length})</h2>
    {pendientes.length ? pendientes.map(tarjeta) : <p className="muted">No hay certificados para revisar.</p>}
    <h2>Historial</h2>
    {resueltos.length ? resueltos.map(tarjeta) : <p className="muted">Todavía no hay certificados revisados.</p>}
  </div>;
}
