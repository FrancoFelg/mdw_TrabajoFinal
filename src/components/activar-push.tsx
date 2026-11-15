'use client';

import { useEffect, useState } from 'react';
import { BellOff, BellRing, LoaderCircle } from 'lucide-react';
import { borrarSuscripcionAction, estaSuscriptoAction, guardarSuscripcionAction } from '@/app/actions/notificaciones';

type Estado = 'cargando' | 'no-soportado' | 'instalar-ios' | 'bloqueado' | 'inactivo' | 'activo';

function claveABytes(base64: string) {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
  const crudo = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(crudo, c => c.charCodeAt(0));
}

// Push en este dispositivo (opcional). Sin claves VAPID en el servidor, la sección no aparece.
export function ActivarPush({ clavePublica }: { clavePublica: string }) {
  const [estado, setEstado] = useState<Estado>('cargando');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [recien, setRecien] = useState(false);

  useEffect(() => {
    (async () => {
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const instalada = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setEstado(ios && !instalada ? 'instalar-ios' : 'no-soportado');
      if (Notification.permission === 'denied') return setEstado('bloqueado');
      const registro = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
      const sub = await registro.pushManager.getSubscription();
      setEstado(sub && await estaSuscriptoAction(sub.endpoint) ? 'activo' : 'inactivo');
    })().catch(() => setEstado('no-soportado'));
  }, []);

  async function activar() {
    setOcupado(true); setError('');
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== 'granted') { setEstado(permiso === 'denied' ? 'bloqueado' : 'inactivo'); return; }
      const registro = await navigator.serviceWorker.ready;
      const sub = await registro.pushManager.getSubscription() ?? await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clavePublica) });
      const r = await guardarSuscripcionAction(JSON.parse(JSON.stringify(sub)));
      if (!r.ok) { setError(r.error ?? 'No pudimos activar los avisos.'); return; }
      setEstado('activo');
      setRecien(true);
    } catch {
      setError('No pudimos activar los avisos en este navegador. Probá de nuevo más tarde.');
    } finally { setOcupado(false); }
  }

  async function desactivar() {
    setOcupado(true); setError('');
    try {
      const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
      if (sub) { await borrarSuscripcionAction(sub.endpoint); await sub.unsubscribe(); }
      setEstado('inactivo');
    } finally { setOcupado(false); }
  }

  const textos: Record<Estado, string> = {
    cargando: 'Revisando este dispositivo…',
    'no-soportado': 'Este navegador no permite avisos push. Los avisos igual te llegan acá, en la app.',
    'instalar-ios': 'En iPhone, primero agregá la app a la pantalla de inicio (Compartir → Agregar a inicio) y abrila desde ahí.',
    bloqueado: 'Bloqueaste los avisos para este sitio. Activalos desde la configuración del navegador.',
    inactivo: 'Te avisamos aunque tengas la app cerrada: casos rojos nuevos y, si coordinás, la cola y los casos sin atender.',
    activo: 'Este dispositivo recibe avisos push.',
  };

  return <div className="grupo push">
    <div className="grupo-fila grupo-fila-texto push-texto">
      {estado === 'activo' ? <BellRing aria-hidden="true" size={22} className={recien ? 'push-suena' : undefined} onAnimationEnd={() => setRecien(false)} /> : <BellOff aria-hidden="true" size={22} />}
      <span><strong>Avisos en este dispositivo</strong><span className="muted" role="status">{textos[estado]}</span></span>
    </div>
    {(estado === 'inactivo' || estado === 'activo') && <button className="grupo-fila grupo-boton" onClick={estado === 'activo' ? desactivar : activar} disabled={ocupado}>
      <span className={`grupo-etiqueta grupo-accion${estado === 'activo' ? ' push-apagar' : ''}`}>
        {ocupado && <LoaderCircle aria-hidden="true" className="girar" size={18} />}
        {estado === 'activo' ? 'Desactivar en este dispositivo' : 'Activar avisos push'}
      </span>
    </button>}
    {error && <p className="grupo-fila error-campo" role="alert">{error}</p>}
  </div>;
}
