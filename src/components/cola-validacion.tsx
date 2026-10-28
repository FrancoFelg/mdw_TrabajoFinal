'use client';

import { useState, useTransition } from 'react';
import { Check, CircleAlert, FileText, LoaderCircle, X } from 'lucide-react';
import { revisarCertificadoAction } from '@/app/actions/formacion';
import { responderAscensoAction } from '@/app/actions/equipo';

export type CertificadoCola = { id: string; persona: string; usuario: string; curso: string | null; codigo: string; cargado: string; archivo: 'pdf' | 'imagen' | null };
export type AscensoCola = { id: string; persona: string; usuario: string; pedido: string; aprobados: number; pendientes: number };

type Paso = { id: string; modo: 'aprobar' | 'rechazar' } | null;

// Cola de coordinación: certificados y pedidos de ascenso. Nada se decide con un solo clic:
// aprobar pide confirmación, rechazar un certificado pide motivo (historia 6).
export function ColaValidacion({ certificados, ascensos }: { certificados: CertificadoCola[]; ascensos: AscensoCola[] }) {
  const [paso, setPaso] = useState<Paso>(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<{ id: string; texto: string } | null>(null);
  const [aviso, setAviso] = useState('');
  const [pendiente, startTransition] = useTransition();

  function abrir(id: string, modo: 'aprobar' | 'rechazar') {
    setPaso({ id, modo }); setMotivo(''); setError(null);
  }

  function confirmarCertificado(c: CertificadoCola) {
    if (!paso) return;
    const aprobar = paso.modo === 'aprobar';
    if (!aprobar && motivo.trim().length < 5) return setError({ id: c.id, texto: 'Contá el motivo (al menos 5 caracteres): la persona lo va a ver.' });
    startTransition(async () => {
      const r = await revisarCertificadoAction(c.id, aprobar, aprobar ? undefined : motivo);
      if (!r.ok) return setError({ id: c.id, texto: r.error });
      setPaso(null);
      setAviso(aprobar ? `Aprobaste el certificado de ${c.persona}. Ya puede tomar casos rojos.` : `Rechazaste el certificado de ${c.persona}. Va a ver el motivo.`);
    });
  }

  function confirmarAscenso(a: AscensoCola) {
    if (!paso) return;
    const aprobar = paso.modo === 'aprobar';
    startTransition(async () => {
      const r = await responderAscensoAction(a.id, aprobar);
      if (!r.ok) return setError({ id: a.id, texto: r.error });
      setPaso(null);
      setAviso(aprobar ? `${a.persona} ahora es coordinador.` : `Rechazaste el pedido de ascenso de ${a.persona}.`);
    });
  }

  const acciones = (id: string, confirmar: () => void, textoAprobar: string, conMotivo: boolean) => {
    const activo = paso?.id === id ? paso : null;
    return <div className="cola-acciones">
      {!activo && <>
        <button className="button button-chico" onClick={() => abrir(id, 'aprobar')}><Check aria-hidden="true" size={18} />Aprobar</button>
        <button className="button button-chico button-peligro" onClick={() => abrir(id, 'rechazar')}><X aria-hidden="true" size={18} />Rechazar</button>
      </>}
      {activo && <div className="confirmar" role="group" aria-label={activo.modo === 'aprobar' ? 'Confirmar aprobación' : 'Confirmar rechazo'}>
        {activo.modo === 'aprobar'
          ? <p>{textoAprobar}</p>
          : conMotivo
            ? <div className="field">
              <label htmlFor={`motivo-${id}`}>Motivo del rechazo</label>
              <textarea id={`motivo-${id}`} className="input textarea textarea-chica" rows={2} maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)} autoFocus placeholder="Ej.: El código no coincide con el certificado." aria-invalid={error?.id === id} aria-describedby={error?.id === id ? `error-${id}` : undefined} />
            </div>
            : <p>¿Rechazás el pedido? La persona puede volver a pedirlo más adelante.</p>}
        <div className="confirmar-botones">
          <button className={activo.modo === 'aprobar' ? 'button button-chico' : 'button button-chico button-peligro-lleno'} disabled={pendiente} onClick={confirmar}>
            {pendiente ? <LoaderCircle aria-hidden="true" className="girar" size={18} /> : null}
            {activo.modo === 'aprobar' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
          </button>
          <button className="button button-chico button-secondary" disabled={pendiente} onClick={() => { setPaso(null); setError(null); }}>Cancelar</button>
        </div>
      </div>}
      {error?.id === id && <p id={`error-${id}`} className="error-campo"><CircleAlert aria-hidden="true" size={16} />{error.texto}</p>}
    </div>;
  };

  return <>
    <p className="cola-aviso" role="status" aria-live="polite">{aviso && <><Check aria-hidden="true" size={18} />{aviso}</>}</p>

    <section className="bloque" aria-labelledby="por-validar">
      <h2 id="por-validar">Certificados por validar <span className="contador">{certificados.length}</span></h2>
      {certificados.length
        ? <table className="cola-tabla">
          <caption className="sr-only">Certificados pendientes de validación</caption>
          <thead><tr><th scope="col">Persona</th><th scope="col">Curso y código</th><th scope="col">Archivo</th><th scope="col">Cargado</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>{certificados.map(c => <tr key={c.id}>
            <td data-etiqueta="Persona"><strong>{c.persona}</strong><span className="muted">@{c.usuario}</span></td>
            <td data-etiqueta="Curso y código"><span>{c.curso ?? 'Capacitación externa'}</span><span className="muted">Código {c.codigo}</span></td>
            <td data-etiqueta="Archivo">{c.archivo
              ? <a className="text-link archivo-enlace" href={`/api/certificados/${c.id}/archivo`} target="_blank" rel="noopener noreferrer"><FileText aria-hidden="true" size={16} />Ver {c.archivo === 'pdf' ? 'PDF' : 'imagen'}<span className="sr-only"> (se abre en otra pestaña)</span></a>
              : <span className="muted">Sin archivo</span>}</td>
            <td data-etiqueta="Cargado"><span className="muted fechas">{c.cargado}</span></td>
            <td>{acciones(c.id, () => confirmarCertificado(c), `¿Aprobás el certificado? ${c.persona} va a poder tomar casos rojos.`, true)}</td>
          </tr>)}</tbody>
        </table>
        : <div className="vacio vacio-chico"><h3>No hay certificados esperando</h3><p>Cuando un voluntario cargue uno, aparece acá con su archivo para que lo revises.</p></div>}
    </section>

    <section className="bloque" aria-labelledby="ascensos">
      <h2 id="ascensos">Pedidos de ascenso <span className="contador">{ascensos.length}</span></h2>
      {ascensos.length
        ? <table className="cola-tabla">
          <caption className="sr-only">Pedidos de ascenso pendientes</caption>
          <thead><tr><th scope="col">Persona</th><th scope="col">Certificados</th><th scope="col">Pedido</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
          <tbody>{ascensos.map(a => <tr key={a.id}>
            <td data-etiqueta="Persona"><strong>{a.persona}</strong><span className="muted">@{a.usuario}</span></td>
            <td data-etiqueta="Certificados"><span>{a.aprobados} aprobado{a.aprobados === 1 ? '' : 's'}</span>{a.pendientes > 0 && <span className="muted">{a.pendientes} en revisión</span>}</td>
            <td data-etiqueta="Pedido"><span className="muted fechas">{a.pedido}</span></td>
            <td>{acciones(a.id, () => confirmarAscenso(a), `¿Aprobás el ascenso? ${a.persona} va a pasar a coordinador.`, false)}</td>
          </tr>)}</tbody>
        </table>
        : <div className="vacio vacio-chico"><h3>No hay pedidos de ascenso</h3><p>Cuando un voluntario pida ascenso, aparece acá con sus certificados.</p></div>}
    </section>
  </>;
}
