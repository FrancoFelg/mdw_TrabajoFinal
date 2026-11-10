'use client';

import { useEffect, useSyncExternalStore } from 'react';

// Ubicación en vivo del voluntario. Un solo watchPosition compartido por el mapa,
// la lista y el detalle. La posición queda en el dispositivo: no se guarda ni se envía.

export type MiUbicacion =
  | { estado: 'inactiva' | 'buscando' | 'denegada' | 'no-disponible' }
  | { estado: 'activa'; lat: number; lng: number; precision: number };

const INICIAL: MiUbicacion = { estado: 'inactiva' };
let actual: MiUbicacion = INICIAL;
let seguimiento: number | null = null;
const suscriptores = new Set<() => void>();

function emitir(nueva: MiUbicacion) {
  actual = nueva;
  suscriptores.forEach(avisar => avisar());
}

function iniciar() {
  if (seguimiento !== null || typeof navigator === 'undefined') return;
  if (!('geolocation' in navigator)) return emitir({ estado: 'no-disponible' });
  if (actual.estado !== 'activa') emitir({ estado: 'buscando' });
  seguimiento = navigator.geolocation.watchPosition(
    pos => emitir({ estado: 'activa', lat: pos.coords.latitude, lng: pos.coords.longitude, precision: Math.round(pos.coords.accuracy) }),
    err => {
      // Permiso denegado: no se puede volver a pedir desde la página. Otros errores son transitorios y el seguimiento sigue.
      if (err.code === err.PERMISSION_DENIED) {
        detener();
        emitir({ estado: 'denegada' });
      } else if (actual.estado !== 'activa') {
        emitir({ estado: 'buscando' });
      }
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
  );
}

function detener() {
  if (seguimiento !== null) navigator.geolocation.clearWatch(seguimiento);
  seguimiento = null;
}

function suscribir(avisar: () => void) {
  suscriptores.add(avisar);
  return () => {
    suscriptores.delete(avisar);
    if (!suscriptores.size) detener();
  };
}

export function useMiUbicacion() {
  const ubicacion = useSyncExternalStore(suscribir, () => actual, () => INICIAL);
  useEffect(() => { iniciar(); }, []);
  return ubicacion;
}

export function reintentarUbicacion() {
  detener();
  emitir({ estado: 'inactiva' });
  iniciar();
}
