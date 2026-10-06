import { postGoogleMaps } from './googleMaps.client';

const COMPUTE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export const MODOS_VIAJE = ['DRIVE', 'WALK', 'BICYCLE', 'TWO_WHEELER'] as const;
export type ModoViaje = (typeof MODOS_VIAJE)[number];

export interface Punto {
  lat: number;
  lng: number;
}

export interface ResultadoRuta {
  distanciaMetros: number;
  duracionSegundos: number;
  modo: ModoViaje;
}

interface RespuestaRoutes {
  routes?: { distanceMeters?: number; duration: string }[];
}

const aLatLng = (p: Punto) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });

export class RutasService {
  // Distancia y tiempo estimado de viaje entre dos puntos (Routes API)
  async calcularRuta(origen: Punto, destino: Punto, modo: ModoViaje = 'DRIVE'): Promise<ResultadoRuta> {
    const datos = await postGoogleMaps<RespuestaRoutes>(
      COMPUTE_ROUTES_URL,
      {
        origin: aLatLng(origen),
        destination: aLatLng(destino),
        travelMode: modo,
        languageCode: 'es',
        regionCode: 'AR',
      },
      'routes.distanceMeters,routes.duration',
    );

    const ruta = datos.routes?.[0];
    if (!ruta) {
      throw new Error('RUTA_NO_ENCONTRADA');
    }

    return {
      // Si origen y destino coinciden Google omite distanceMeters
      distanciaMetros: ruta.distanceMeters ?? 0,
      duracionSegundos: parseInt(ruta.duration, 10),
      modo,
    };
  }
}
