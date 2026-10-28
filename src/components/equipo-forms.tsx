'use client';

import { useState, useTransition } from 'react';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import { solicitarAscensoAction } from '@/app/actions/equipo';
import { Alert } from './ui';

// Pedir ascenso: un paso de confirmación antes de enviar, para que no salga de un toque sin querer.
export function SolicitarAscenso() {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState('');
  const [pendiente, start] = useTransition();
  if (!confirmando) return <button className="grupo-fila grupo-boton" onClick={() => setConfirmando(true)}>
    <span className="grupo-etiqueta grupo-accion"><ArrowUpRight aria-hidden="true" size={20} />Pedir ascenso a coordinador</span>
  </button>;
  return <div className="grupo-fila grupo-confirmar" role="group" aria-label="Confirmar pedido de ascenso">
    <p>¿Enviás el pedido? Alguien de coordinación revisa tu historial y tus certificados.</p>
    {error && <Alert>{error}</Alert>}
    <div className="confirmar-botones">
      <button className="button button-chico" disabled={pendiente} autoFocus onClick={() => start(async () => { const r = await solicitarAscensoAction(); if (!r.ok) setError(r.error); })}>
        {pendiente && <LoaderCircle aria-hidden="true" className="girar" size={18} />}{pendiente ? 'Enviando…' : 'Enviar pedido'}
      </button>
      <button className="button button-chico button-secondary" disabled={pendiente} onClick={() => { setConfirmando(false); setError(''); }}>Cancelar</button>
    </div>
  </div>;
}
