'use client';

import Link from 'next/link';
import { marcarLeidaAction } from '@/app/actions/notificaciones';

// Un aviso: tocarlo lo marca como leído y lleva al caso o a la cola.
export function AvisoItem({ id, enlace, leida, children }: { id: string; enlace: string; leida: boolean; children: React.ReactNode }) {
  return <Link href={enlace} className={leida ? 'aviso-item' : 'aviso-item no-leida'} onClick={() => { if (!leida) void marcarLeidaAction(id); }}>
    {children}
  </Link>;
}
