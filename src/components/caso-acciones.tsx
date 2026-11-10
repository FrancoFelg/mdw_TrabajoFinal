'use client';

import Link from 'next/link';
import { useActionState, useState, useTransition } from 'react';
import type { EmergenciaEstado } from '@prisma/client';
import { CircleCheck, Hand, LoaderCircle, Lock } from 'lucide-react';
import { finalizarCasoAction, tomarCasoAction } from '@/app/actions/emergencias';
import { Alert } from './ui';

type Props = {
  id: string; estado: EmergenciaEstado; propio: boolean; asignado: string | null;
  bloqueo: { texto: string; enlace?: { href: string; texto: string } } | null;
};

export function CasoAcciones({ id, estado, propio, asignado, bloqueo }: Props) {
  const [error, setError] = useState('');
  const [tomando, startTomar] = useTransition();
  const [fin, finalizar, finalizando] = useActionState(finalizarCasoAction.bind(null, id), { ok: false, error: '' });

  if (estado === 'SIN_GESTIONAR') {
    return <div className="acciones-caso">
      {bloqueo
        ? <div className="bloqueo"><Lock aria-hidden="true" size={20} /><p>{bloqueo.texto}{bloqueo.enlace && <> <Link className="text-link" href={bloqueo.enlace.href}>{bloqueo.enlace.texto}</Link></>}</p></div>
        : <p className="muted">Al tomarlo, el caso queda a tu nombre y nadie más lo puede tomar.</p>}
      {error && <Alert>{error}</Alert>}
      <button className="button button-grande" disabled={tomando || !!bloqueo} onClick={() => startTomar(async () => {
        const r = await tomarCasoAction(id);
        setError(r.ok ? '' : r.error);
      })}>
        {tomando ? <LoaderCircle aria-hidden="true" className="girar" size={22} /> : <Hand aria-hidden="true" size={22} />}
        {tomando ? 'Tomando…' : 'Tomar caso'}
      </button>
    </div>;
  }

  if (estado === 'EN_CAMINO' && propio) {
    return <form className="acciones-caso" action={finalizar} aria-busy={finalizando}>
      <div className="field">
        <label htmlFor="informe">Informe final</label>
        <textarea id="informe" name="informe" className="input textarea" rows={4} required minLength={10} maxLength={2000} placeholder="Qué encontraste, qué hiciste y cómo quedó la persona." aria-describedby="informe-ayuda" />
        <p id="informe-ayuda" className="muted">Al finalizar, el caso pasa a Gestionada y sale de la lista.</p>
      </div>
      {fin.error && <Alert>{fin.error}</Alert>}
      <button className="button button-grande" disabled={finalizando}>
        {finalizando ? <LoaderCircle aria-hidden="true" className="girar" size={22} /> : <CircleCheck aria-hidden="true" size={22} />}
        {finalizando ? 'Finalizando…' : 'Finalizar atención'}
      </button>
    </form>;
  }

  if (estado === 'EN_CAMINO') return <p className="acciones-caso nota">{asignado ?? 'Otro voluntario'} ya va en camino a este caso.</p>;
  if (estado === 'GESTIONADA') return <p className="acciones-caso nota"><CircleCheck aria-hidden="true" size={20} />Caso gestionado. Gracias por la ayuda.</p>;
  return null;
}
