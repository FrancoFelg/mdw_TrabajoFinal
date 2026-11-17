'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Pencil, Trash2 } from 'lucide-react';
import { Button, Card } from './ui';
import { MarcaRevision } from './marcas';
import { darDeBajaCertificadoAction } from '@/app/actions/formacion';
import { editable, fechaLegible, valorAtributo, type CertificadoVista } from '@/lib/certificados-vista';

export function CertificadosListado({ certificados }: { certificados: CertificadoVista[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function darDeBaja(c: CertificadoVista) {
    if (ocupado || !window.confirm(`¿Dar de baja "${c.nombre}"? No se puede deshacer.`)) return;
    setOcupado(c.id);
    setError('');
    try {
      const resultado = await darDeBajaCertificadoAction(c.id);
      if (resultado.ok) router.refresh();
      else setError(resultado.error || 'No pudimos dar de baja el certificado.');
    } catch {
      setError('No pudimos confirmar la baja. Actualizá la página antes de reintentar.');
    } finally {
      setOcupado(null);
    }
  }

  return <div className="stack" aria-busy={ocupado !== null}>
    {error && <p className="alert" role="alert">{error}</p>}
    {certificados.map(c => <Card key={c.id}>
      <div className="certificado-cabecera">
        <h2>{c.nombre}</h2>
        <MarcaRevision estado={c.estado} />
      </div>
      <dl className="datos">
        {c.curso && <div><dt>Curso</dt><dd>{c.curso}</dd></div>}
        <div><dt>Entidad emisora</dt><dd>{c.entidadEmisora}</dd></div>
        <div><dt>Emitido</dt><dd>{fechaLegible(c.fechaEmision)}</dd></div>
        {c.codigoVerificacion && <div><dt>Número</dt><dd>{c.codigoVerificacion}</dd></div>}
        {c.atributos.map(a => <div key={a.campoId}><dt>{a.nombre}</dt><dd>{valorAtributo(a.tipo, a.dato)}</dd></div>)}
      </dl>
      {c.estado === 'RECHAZADO' && c.motivoRechazo && <p className="aviso">Motivo del rechazo: {c.motivoRechazo}</p>}
      <div className="actions">
        <a className="button button-chico button-secondary" href={`/api/certificados/${c.id}/archivo`} target="_blank" rel="noopener">
          <FileText aria-hidden="true" size={18} />Ver archivo<span className="sr-only"> de {c.nombre} (se abre en otra pestaña)</span>
        </a>
        {editable(c.estado) && <Link className="button button-chico button-secondary" href={`/certificados/${c.id}/editar`}>
          <Pencil aria-hidden="true" size={18} />Editar<span className="sr-only"> {c.nombre}</span>
        </Link>}
        <Button className="button-chico button-peligro" disabled={ocupado !== null} onClick={() => darDeBaja(c)}>
          <Trash2 aria-hidden="true" size={18} />{ocupado === c.id ? 'Dando de baja…' : 'Dar de baja'}<span className="sr-only"> {c.nombre}</span>
        </Button>
      </div>
    </Card>)}
  </div>;
}
