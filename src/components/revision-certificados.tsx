'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
import { Button, Card } from './ui';
import { MarcaRevision } from './marcas';
import { fechaLegible } from '@/lib/certificados-vista';

export type CertificadoRevision = {
  id: string; nombre: string; entidadEmisora: string; fechaEmision: string; codigoVerificacion: string | null;
  estado: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'; motivoRechazo: string | null; persona: string; curso: string | null;
};

// Cola de validación (historia 6): pendientes primero, luego el historial resuelto.
export function RevisionCertificados({ certificados }: { certificados: CertificadoRevision[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState<{ error: boolean; texto: string } | null>(null);

  async function resolver(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setOcupado(true); setMensaje(null);
    try {
      const response = await fetch(`/api/certificados/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: data.get('estado'), motivo: data.get('motivo') }),
        signal: AbortSignal.timeout(20000),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'No se pudo guardar la validación.');
      setMensaje({ error: false, texto: 'Validación guardada.' });
      router.refresh();
    } catch (error) {
      setMensaje({ error: true, texto: error instanceof Error && error.name !== 'TimeoutError' && error.name !== 'TypeError' ? error.message : 'No se pudo confirmar la validación. Actualizá la página antes de reintentar.' });
    } finally { setOcupado(false); }
  }

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
    {c.estado === 'PENDIENTE' && <form className="stack-chico" onSubmit={event => resolver(event, c.id)}>
      <div className="field"><label htmlFor={`resultado-${c.id}`}>Resultado</label>
        <select id={`resultado-${c.id}`} name="estado" className="input"><option value="APROBADO">Aprobar</option><option value="RECHAZADO">Rechazar</option></select></div>
      <div className="field"><label htmlFor={`motivo-${c.id}`}>Motivo del rechazo</label>
        <textarea id={`motivo-${c.id}`} name="motivo" className="input textarea" maxLength={2000} /></div>
      <div><Button disabled={ocupado} type="submit">Guardar validación</Button></div>
    </form>}
  </Card>;

  return <div className="stack" aria-busy={ocupado}>
    <p role="status" className={mensaje?.error ? 'alert' : undefined}>{mensaje?.texto}</p>
    <h2>Pendientes ({pendientes.length})</h2>
    {pendientes.length ? pendientes.map(tarjeta) : <p className="muted">No hay certificados para revisar.</p>}
    <h2>Historial</h2>
    {resueltos.length ? resueltos.map(tarjeta) : <p className="muted">Todavía no hay certificados revisados.</p>}
  </div>;
}
