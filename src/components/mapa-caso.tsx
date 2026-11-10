'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';
import type { EmergenciaEstado, Prioridad } from '@prisma/client';
import { distanciaMetros, formatoDistancia } from '@/lib/casos';
import { useMiUbicacion } from '@/lib/mi-ubicacion';

const MapaCasos = dynamic(() => import('./mapa-casos'), { ssr: false, loading: () => <div className="mapa mapa-chico mapa-cargando" role="status">Cargando mapa…</div> });

export function MapaCaso({ id, lat, lng, prioridad, estado }: { id: string; lat: number; lng: number; prioridad: Prioridad; estado: EmergenciaEstado }) {
  const yo = useMiUbicacion();
  const casos = useMemo(() => [{ id, lat, lng, prioridad, estado, descripcion: '', hace: '', fecha: '', provincia: '', asignado: null, propio: false }], [id, lat, lng, prioridad, estado]);
  return <MapaCasos solo yo={yo} casos={casos} />;
}

// Fila "Estás a…" del detalle: distancia en línea recta desde la ubicación en vivo.
export function DistanciaCaso({ lat, lng }: { lat: number; lng: number }) {
  const yo = useMiUbicacion();
  const valor = yo.estado === 'activa'
    ? `a ${formatoDistancia(distanciaMetros(yo, { lat, lng }))} en línea recta`
    : yo.estado === 'denegada' ? 'Activá la ubicación para verlo' : yo.estado === 'no-disponible' ? 'No disponible' : 'Buscando tu ubicación…';
  return <div className="grupo-fila">
    <span className="grupo-etiqueta">Estás</span>
    <span className="grupo-valor" aria-live="polite">{valor}</span>
  </div>;
}
