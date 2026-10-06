import { Provincia } from '@prisma/client';
import { postGoogleMaps } from './googleMaps.client';

const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

export interface ResultadoGeocoding {
  lat: number;
  lng: number;
  provincia: Provincia;
  direccionFormateada: string;
}

export interface SugerenciaDireccion {
  placeId: string;
  texto: string; // dirección completa, lista para mandar como `direccion`
  principal: string;
  secundario: string;
}

// Respuestas de Places API (New), solo los campos pedidos en el FieldMask
interface RespuestaTextSearch {
  places?: {
    formattedAddress: string;
    location: { latitude: number; longitude: number };
    addressComponents: { longText: string; shortText: string; types: string[] }[];
  }[];
}

interface RespuestaAutocomplete {
  suggestions?: {
    placePrediction?: {
      placeId: string;
      text: { text: string };
      structuredFormat?: { mainText: { text: string }; secondaryText?: { text: string } };
    };
  }[];
}

// Nombre que devuelve Google en administrative_area_level_1 (normalizado:
// minúsculas, sin tildes, sin "provincia de") -> enum Provincia
const PROVINCIAS: Record<string, Provincia> = {
  'buenos aires': Provincia.BUENOS_AIRES,
  'ciudad autonoma de buenos aires': Provincia.CABA,
  'caba': Provincia.CABA,
  'catamarca': Provincia.CATAMARCA,
  'chaco': Provincia.CHACO,
  'chubut': Provincia.CHUBUT,
  'cordoba': Provincia.CORDOBA,
  'corrientes': Provincia.CORRIENTES,
  'entre rios': Provincia.ENTRE_RIOS,
  'formosa': Provincia.FORMOSA,
  'jujuy': Provincia.JUJUY,
  'la pampa': Provincia.LA_PAMPA,
  'la rioja': Provincia.LA_RIOJA,
  'mendoza': Provincia.MENDOZA,
  'misiones': Provincia.MISIONES,
  'neuquen': Provincia.NEUQUEN,
  'rio negro': Provincia.RIO_NEGRO,
  'salta': Provincia.SALTA,
  'san juan': Provincia.SAN_JUAN,
  'san luis': Provincia.SAN_LUIS,
  'santa cruz': Provincia.SANTA_CRUZ,
  'santa fe': Provincia.SANTA_FE,
  'santiago del estero': Provincia.SANTIAGO_DEL_ESTERO,
  'tierra del fuego': Provincia.TIERRA_DEL_FUEGO,
  'tierra del fuego, antartida e islas del atlantico sur': Provincia.TIERRA_DEL_FUEGO,
  'tucuman': Provincia.TUCUMAN,
};

function normalizar(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^provincia de /, '')
    .replace(/ province$/, '')
    .trim();
}

export class GeocodingService {
  // Convierte una dirección escrita a mano en coordenadas + provincia.

  async geocodificar(direccion: string): Promise<ResultadoGeocoding> {
    const datos = await postGoogleMaps<RespuestaTextSearch>(
      TEXT_SEARCH_URL,
      {
        textQuery: direccion,
        languageCode: 'es',
        regionCode: 'AR',
        pageSize: 1,
      },
      'places.formattedAddress,places.location,places.addressComponents',
    );

    const resultado = datos.places?.[0];
    const pais = resultado?.addressComponents.find((c) => c.types.includes('country'));
    if (!resultado || pais?.shortText !== 'AR') {
      throw new Error('DIRECCION_NO_ENCONTRADA');
    }

    const componenteProvincia = resultado.addressComponents.find((c) =>
      c.types.includes('administrative_area_level_1'),
    );
    const provincia = componenteProvincia && PROVINCIAS[normalizar(componenteProvincia.longText)];
    if (!provincia) {
      throw new Error('PROVINCIA_NO_RECONOCIDA');
    }

    return {
      lat: resultado.location.latitude,
      lng: resultado.location.longitude,
      provincia,
      direccionFormateada: resultado.formattedAddress,
    };
  }

  // Sugerencias mientras el usuario escribe la dirección (solo Argentina).
  // `sessionToken` agrupa las teclas de una misma búsqueda para que Google
  // las facture como una sola sesión; lo genera el cliente (un UUID).
  async sugerirDirecciones(texto: string, sessionToken?: string): Promise<SugerenciaDireccion[]> {
    const datos = await postGoogleMaps<RespuestaAutocomplete>(
      AUTOCOMPLETE_URL,
      {
        input: texto,
        languageCode: 'es',
        includedRegionCodes: ['ar'],
        sessionToken,
      },
      'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
    );

    return (datos.suggestions ?? []).flatMap(({ placePrediction: p }) =>
      p
        ? [{
            placeId: p.placeId,
            texto: p.text.text,
            principal: p.structuredFormat?.mainText.text ?? p.text.text,
            secundario: p.structuredFormat?.secondaryText?.text ?? '',
          }]
        : [],
    );
  }
}
