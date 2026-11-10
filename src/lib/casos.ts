import type { EmergenciaEstado, Prioridad, Provincia } from '@prisma/client';

// Código corto de un caso: los últimos 4 caracteres del id. Es el mismo en la
// lista, en el mapa y en el detalle, para que se puedan cruzar de un vistazo.
export function codigoCaso(id: string) {
  return id.slice(-4).toUpperCase();
}

export const PRIORIDADES: Record<Prioridad, { nombre: string; detalle: string }> = {
  ROJO: { nombre: 'Rojo', detalle: 'Grave' },
  AMARILLO: { nombre: 'Amarillo', detalle: 'Urgente' },
  VERDE: { nombre: 'Verde', detalle: 'Puede esperar' },
};

export const ORDEN_PRIORIDAD: Record<Prioridad, number> = { ROJO: 0, AMARILLO: 1, VERDE: 2 };

export const ESTADOS: Record<EmergenciaEstado, string> = {
  SIN_GESTIONAR: 'Sin gestionar',
  EN_CAMINO: 'En camino',
  GESTIONADA: 'Gestionada',
  CANCELADA: 'Cancelada',
};

export const NOMBRES_PROVINCIA: Record<Provincia, string> = {
  BUENOS_AIRES: 'Buenos Aires',
  CABA: 'CABA',
  CATAMARCA: 'Catamarca',
  CHACO: 'Chaco',
  CHUBUT: 'Chubut',
  CORDOBA: 'Córdoba',
  CORRIENTES: 'Corrientes',
  ENTRE_RIOS: 'Entre Ríos',
  FORMOSA: 'Formosa',
  JUJUY: 'Jujuy',
  LA_PAMPA: 'La Pampa',
  LA_RIOJA: 'La Rioja',
  MENDOZA: 'Mendoza',
  MISIONES: 'Misiones',
  NEUQUEN: 'Neuquén',
  RIO_NEGRO: 'Río Negro',
  SALTA: 'Salta',
  SAN_JUAN: 'San Juan',
  SAN_LUIS: 'San Luis',
  SANTA_CRUZ: 'Santa Cruz',
  SANTA_FE: 'Santa Fe',
  SANTIAGO_DEL_ESTERO: 'Santiago del Estero',
  TIERRA_DEL_FUEGO: 'Tierra del Fuego',
  TUCUMAN: 'Tucumán',
};

// Estimación de provincia desde el GPS sin servicios externos: CABA por polígono
// (General Paz, Riachuelo y el río) y el resto por la ciudad de referencia más cercana.
// Usar ciudades, no solo capitales, evita errores como Rosario → Entre Ríos.
const CABA: [number, number][] = [
  [-34.5265, -58.4600], [-34.5370, -58.4950], [-34.5520, -58.5050], [-34.5800, -58.5290],
  [-34.6150, -58.5310], [-34.6350, -58.5290], [-34.6520, -58.5160], [-34.6650, -58.4900],
  [-34.7050, -58.4610], [-34.6810, -58.4200], [-34.6600, -58.3900], [-34.6460, -58.3600],
  [-34.6360, -58.3480], [-34.6000, -58.3480], [-34.5700, -58.3880], [-34.5400, -58.4400],
];

function dentroDe(poligono: [number, number][], lat: number, lng: number) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [yi, xi] = poligono[i];
    const [yj, xj] = poligono[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) dentro = !dentro;
  }
  return dentro;
}

const CIUDADES: [Provincia, number, number][] = [
  ['BUENOS_AIRES', -34.92, -57.95], ['BUENOS_AIRES', -38.0, -57.55], ['BUENOS_AIRES', -38.72, -62.27], ['BUENOS_AIRES', -37.32, -59.13],
  ['BUENOS_AIRES', -34.66, -58.36], ['BUENOS_AIRES', -34.53, -58.48], ['BUENOS_AIRES', -34.76, -58.40], ['BUENOS_AIRES', -34.65, -58.62],
  ['BUENOS_AIRES', -34.45, -58.91], ['BUENOS_AIRES', -33.33, -60.22], ['BUENOS_AIRES', -34.58, -60.95], ['BUENOS_AIRES', -36.77, -59.86],
  ['CATAMARCA', -28.47, -65.78], ['CHACO', -27.45, -58.99], ['CHACO', -26.79, -60.44],
  ['CHUBUT', -43.30, -65.10], ['CHUBUT', -45.86, -67.48], ['CHUBUT', -42.77, -65.04], ['CHUBUT', -42.91, -71.32],
  ['CORDOBA', -31.42, -64.18], ['CORDOBA', -33.12, -64.35], ['CORDOBA', -32.41, -63.24], ['CORDOBA', -31.43, -62.08],
  ['CORRIENTES', -27.47, -58.83], ['CORRIENTES', -29.18, -58.07], ['ENTRE_RIOS', -31.73, -60.53], ['ENTRE_RIOS', -32.48, -58.24], ['ENTRE_RIOS', -31.39, -58.02],
  ['FORMOSA', -26.18, -58.17], ['JUJUY', -24.19, -65.30], ['LA_PAMPA', -36.62, -64.29], ['LA_PAMPA', -35.66, -63.76],
  ['LA_RIOJA', -29.41, -66.86], ['MENDOZA', -32.89, -68.83], ['MENDOZA', -34.62, -68.33], ['MISIONES', -27.37, -55.90], ['MISIONES', -25.60, -54.58],
  ['NEUQUEN', -38.95, -68.06], ['NEUQUEN', -40.16, -71.35], ['RIO_NEGRO', -40.81, -63.00], ['RIO_NEGRO', -41.13, -71.31], ['RIO_NEGRO', -39.03, -67.58],
  ['SALTA', -24.79, -65.41], ['SALTA', -22.52, -63.80], ['SAN_JUAN', -31.54, -68.53], ['SAN_LUIS', -33.30, -66.34], ['SAN_LUIS', -33.68, -65.46],
  ['SANTA_CRUZ', -51.62, -69.22], ['SANTA_CRUZ', -46.44, -67.52], ['SANTA_CRUZ', -50.34, -72.26],
  ['SANTA_FE', -31.63, -60.70], ['SANTA_FE', -32.95, -60.65], ['SANTA_FE', -31.25, -61.49], ['SANTA_FE', -29.15, -59.65], ['SANTA_FE', -33.74, -61.97],
  ['SANTIAGO_DEL_ESTERO', -27.80, -64.26], ['TIERRA_DEL_FUEGO', -54.80, -68.30], ['TIERRA_DEL_FUEGO', -53.79, -67.70], ['TUCUMAN', -26.81, -65.22],
];

export function estimarProvincia(lat: number, lng: number): Provincia {
  if (dentroDe(CABA, lat, lng)) return 'CABA';
  let mejor: Provincia = 'BUENOS_AIRES';
  let distancia = Infinity;
  for (const [provincia, cLat, cLng] of CIUDADES) {
    const d = (lat - cLat) ** 2 + ((lng - cLng) * Math.cos((lat * Math.PI) / 180)) ** 2;
    if (d < distancia) {
      distancia = d;
      mejor = provincia;
    }
  }
  return mejor;
}

const relativo = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });

export function haceCuanto(fecha: Date | string, ahora = Date.now()) {
  const minutos = Math.round((new Date(fecha).getTime() - ahora) / 60000);
  if (Math.abs(minutos) < 60) return relativo.format(minutos, 'minute');
  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return relativo.format(horas, 'hour');
  return relativo.format(Math.round(horas / 24), 'day');
}

export function fechaCorta(fecha: Date | string) {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(fecha));
}

// Fechas sin hora (cursos): se guardan a medianoche UTC, se muestran en UTC para no correrse un día.
export function fechaDia(fecha: Date | string) {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(fecha));
}

export function horaCorta(fecha: Date | string) {
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(fecha));
}

export const esCoordinador = (rol?: string) => rol === 'COORDINADOR' || rol === 'ADMIN';

// Distancia en línea recta (haversine), en metros. Es orientativa: el recorrido real puede ser más largo.
export function distanciaMetros(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

export function formatoDistancia(metros: number) {
  if (metros < 1000) return `${Math.max(10, Math.round(metros / 10) * 10)} m`;
  return `${(metros / 1000).toLocaleString('es-AR', { maximumFractionDigits: metros < 10000 ? 1 : 0 })} km`;
}

// Habilitación para casos rojos según los certificados de la persona (regla 2).
export type EstadoHabilitacion = 'aprobado' | 'revision' | 'rechazado' | 'sin';
export function estadoHabilitacion(certificados: { estado: string }[]): EstadoHabilitacion {
  if (certificados.some(c => c.estado === 'APROBADO')) return 'aprobado';
  if (certificados.some(c => c.estado === 'PENDIENTE')) return 'revision';
  if (certificados.some(c => c.estado === 'RECHAZADO')) return 'rechazado';
  return 'sin';
}
