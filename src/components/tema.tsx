'use client';

import { useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { Moon, Sun, SunMoon } from 'lucide-react';
import { COOKIE_TEMA, leerTema, type Tema } from '@/lib/tema';

function temaEfectivo(): Tema {
  const elegido = leerTema(document.documentElement.dataset.theme);
  return elegido ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}

function aplicar(tema: Tema | null) {
  const raiz = document.documentElement;
  if (tema) raiz.dataset.theme = tema;
  else delete raiz.dataset.theme;
  // Cookie y no localStorage: el servidor la lee y pinta el tema correcto desde el primer cuadro.
  document.cookie = tema ? `${COOKIE_TEMA}=${tema}; path=/; max-age=31536000; samesite=lax` : `${COOKIE_TEMA}=; path=/; max-age=0`;
  const color = temaEfectivo() === 'dark' ? '#000000' : '#ffffff';
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.setAttribute('content', color));
}

// Cambia el tema con una ola que se pinta desde la esquina superior izquierda (ver ::view-transition en globals.css).
// `actualizar` corre dentro de la captura para que la interfaz nueva ya muestre el estado elegido.
function cambiarTema(tema: Tema | null, actualizar?: () => void) {
  const antes = temaEfectivo();
  const cambio = () => flushSync(() => { aplicar(tema); actualizar?.(); });
  const sinAnimacion = !document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (sinAnimacion) return cambio();
  const raiz = document.documentElement;
  raiz.classList.add('cambiando-tema');
  const transicion = document.startViewTransition(() => {
    cambio();
    // Si el tema visible no cambia (p. ej. "Automático" con el sistema igual), no hay ola.
    if (temaEfectivo() === antes) transicion.skipTransition();
  });
  transicion.finished.finally(() => raiz.classList.remove('cambiando-tema'));
}

// Avisa cuando cambia el tema efectivo: por elección (data-theme) o por el sistema.
function suscribir(aviso: () => void) {
  const sistema = matchMedia('(prefers-color-scheme: dark)');
  sistema.addEventListener('change', aviso);
  const observador = new MutationObserver(aviso);
  observador.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => { sistema.removeEventListener('change', aviso); observador.disconnect(); };
}

// Botón del encabezado: alterna claro y oscuro. Los dos íconos se renderizan y el CSS muestra el que corresponde,
// así el servidor no necesita saber el tema del sistema.
export function TemaBoton() {
  const oscuro = useSyncExternalStore(suscribir, () => temaEfectivo() === 'dark', () => undefined);
  return <button type="button" className="tema-boton" aria-pressed={oscuro} aria-label="Modo oscuro"
    onClick={() => cambiarTema(temaEfectivo() === 'dark' ? 'light' : 'dark')}>
    <Moon aria-hidden="true" size={22} className="tema-luna" /><Sun aria-hidden="true" size={22} className="tema-sol" />
  </button>;
}

const OPCIONES = [
  { valor: null, texto: 'Automático', Icono: SunMoon },
  { valor: 'light', texto: 'Claro', Icono: Sun },
  { valor: 'dark', texto: 'Oscuro', Icono: Moon },
] as const;

// Cuenta: además de elegir, permite volver a seguir el tema del sistema.
export function Apariencia({ inicial }: { inicial: Tema | null }) {
  const [elegido, setElegido] = useState<Tema | null>(inicial);
  return <div className="segmentos segmentos-3" role="group" aria-label="Apariencia">
    {OPCIONES.map(({ valor, texto, Icono }) => <button key={texto} type="button" aria-pressed={elegido === valor}
      onClick={() => cambiarTema(valor, () => setElegido(valor))}>
      <Icono aria-hidden="true" size={18} />{texto}
    </button>)}
  </div>;
}
