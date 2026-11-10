'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';

// Campanita del encabezado: cuántos avisos sin leer hay. Consulta cada 30 s con la pestaña visible.
// Cuando el contador sube (llegó algo nuevo), la campana suena y el contador aparece: es el
// único momento animado del encabezado, y nunca se dispara al cargar la página.
export function Campana() {
  const [noLeidas, setNoLeidas] = useState(0);
  const [suena, setSuena] = useState(false);
  const [anuncio, setAnuncio] = useState('');
  const anterior = useRef<number | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    let vivo = true;
    const consultar = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const r = await fetch('/api/notificaciones?resumen=1', { cache: 'no-store' });
        if (!r.ok || !vivo) return;
        const n: number = (await r.json()).noLeidas ?? 0;
        if (anterior.current !== null && n > anterior.current) {
          setSuena(true);
          setAnuncio(n - anterior.current === 1 ? 'Tenés un aviso nuevo' : `Tenés ${n - anterior.current} avisos nuevos`);
        }
        anterior.current = n;
        setNoLeidas(n);
      } catch { /* sin conexión: se reintenta en la próxima vuelta */ }
    };
    consultar();
    const id = setInterval(consultar, 30000);
    document.addEventListener('visibilitychange', consultar);
    return () => { vivo = false; clearInterval(id); document.removeEventListener('visibilitychange', consultar); };
  }, [pathname]);

  const texto = noLeidas ? `Avisos, ${noLeidas} sin leer` : 'Avisos';
  return <Link href="/notificaciones" className={suena ? 'campana campana-suena' : 'campana'} aria-label={texto} aria-current={pathname === '/notificaciones' ? 'page' : undefined}>
    <Bell aria-hidden="true" size={22} onAnimationEnd={() => setSuena(false)} />
    {noLeidas > 0 && <span key={suena ? `nuevo-${noLeidas}` : 'fijo'} className={suena ? 'campana-contador contador-nuevo' : 'campana-contador'} aria-hidden="true">{noLeidas > 9 ? '9+' : noLeidas}</span>}
    <span className="sr-only" aria-live="polite">{anuncio}</span>
  </Link>;
}
