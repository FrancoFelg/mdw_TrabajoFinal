import { z } from 'zod';
import { EmergenciaRepository } from '../repositories/emergencia.repository';
import { GeocodingService } from './geocoding.service';
import { ModoViaje, Punto, RutasService } from './rutas.service';
import { EmergenciaEstado, Prioridad, Provincia } from '@prisma/client';


// Body de POST /api/emergencias. La ubicación llega de una de dos formas:
//   - GPS: coordenada_x + coordenada_y + provincia
//   - Dirección manual: direccion (se geocodifica con Google Maps)

const ERROR_X = 'coordenada_x (longitud) debe estar entre -180 y 180.';
const ERROR_Y = 'coordenada_y (latitud) debe estar entre -90 y 90.';

export const CrearEmergenciaSchema = z
  .object({
    descripcion: z.string().trim().min(5, 'La descripción debe tener al menos 5 caracteres.'),
    imagen: z.string().url('La imagen debe ser una URL válida.').optional(),
    prioridad: z.nativeEnum(Prioridad, { message: 'La prioridad debe ser ROJO, AMARILLO o VERDE.' }).optional(),
    direccion: z.string().trim().min(3, 'La dirección es demasiado corta.').optional(),
    coordenada_x: z.number().min(-180, ERROR_X).max(180, ERROR_X).optional(),
    coordenada_y: z.number().min(-90, ERROR_Y).max(90, ERROR_Y).optional(),
    provincia: z.nativeEnum(Provincia).optional(),
  })
  .refine(
    (d) =>
      d.direccion !== undefined ||
      (d.coordenada_x !== undefined && d.coordenada_y !== undefined && d.provincia !== undefined),
    { message: 'Debe enviar una dirección, o coordenada_x + coordenada_y + provincia.' },
  );
export type CrearEmergenciaInput = z.infer<typeof CrearEmergenciaSchema>;

// Contrato de GET /api/emergencias: un punto listo para dibujar en un mapa
export interface EmergenciaMapa {
  id: string;
  descripcion: string;
  fecha: string;
  prioridad: Prioridad;
  estado: EmergenciaEstado;
  provincia: Provincia;
  coordenada_x: number; // longitud
  coordenada_y: number; // latitud
}

export class EmergenciaService {
  private emergenciaRepo: EmergenciaRepository;
  private geocoding: GeocodingService;
  private rutas: RutasService;

  constructor() {
    this.emergenciaRepo = new EmergenciaRepository();
    this.geocoding = new GeocodingService();
    this.rutas = new RutasService();
  }

  // Alta de emergencia (requiere login). Nace SIN_GESTIONAR; la prioridad es la que
  // mande el cliente o VERDE por defecto.
  // Si llegan coordenadas de GPS se usan tal cual; si no, se geocodifica la dirección.
  async crear(datos: CrearEmergenciaInput) {
    let coordenada_x: number;
    let coordenada_y: number;
    let provincia: Provincia;
    let direccionFormateada: string | undefined;

    if (datos.coordenada_x !== undefined && datos.coordenada_y !== undefined && datos.provincia !== undefined) {
      coordenada_x = datos.coordenada_x;
      coordenada_y = datos.coordenada_y;
      provincia = datos.provincia;
    } else {
      const geo = await this.geocoding.geocodificar(datos.direccion as string);
      coordenada_x = geo.lng;
      coordenada_y = geo.lat;
      provincia = geo.provincia;
      direccionFormateada = geo.direccionFormateada;
    }

    const emergencia = await this.emergenciaRepo.crear({
      descripcion: datos.descripcion,
      imagen: datos.imagen,
      prioridad: datos.prioridad ?? Prioridad.VERDE,
      coordenada_x,
      coordenada_y,
      provincia,
    });

    return {
      id: emergencia.id,
      descripcion: emergencia.descripcion,
      fecha: emergencia.fecha.toISOString(),
      prioridad: emergencia.prioridad,
      estado: emergencia.estado,
      provincia,
      coordenada_x,
      coordenada_y,
      direccionFormateada,
    };
  }

  // Tiempo estimado de llegada desde la posición actual del voluntario
  // (la manda su dispositivo) hasta la emergencia. `origen` viene en lat/lng
  // (formato de Google); la respuesta se devuelve en coordenada_x/y.
  async calcularEta(emergenciaId: string, origen: Punto, modo?: ModoViaje) {
    const emergencia = await this.emergenciaRepo.findByIdConUbicacion(emergenciaId);
    if (!emergencia) {
      throw new Error('EMERGENCIA_NO_ENCONTRADA');
    }

    const { coordenada_x, coordenada_y } = emergencia.ubicacion;
    if (coordenada_x === null || coordenada_y === null) {
      throw new Error('EMERGENCIA_SIN_COORDENADAS');
    }

    const ruta = await this.rutas.calcularRuta(origen, { lat: coordenada_y, lng: coordenada_x }, modo);

    return {
      emergenciaId,
      estado: emergencia.estado,
      origen: { coordenada_x: origen.lng, coordenada_y: origen.lat },
      destino: { coordenada_x, coordenada_y },
      ...ruta,
      llegadaEstimada: new Date(Date.now() + ruta.duracionSegundos * 1000).toISOString(),
    };
  }

  // Emergencias activas listas para dibujar en el mapa
  async listarParaMapa(): Promise<EmergenciaMapa[]> {
    const emergencias = await this.emergenciaRepo.findActivasConUbicacion();
    return emergencias.map((e) => ({
      id: e.id,
      descripcion: e.descripcion,
      fecha: e.fecha.toISOString(),
      prioridad: e.prioridad,
      estado: e.estado,
      provincia: e.ubicacion.provincia,
      coordenada_x: e.ubicacion.coordenada_x as number,
      coordenada_y: e.ubicacion.coordenada_y as number,
    }));
  }

  async tomarEmergencia(emergenciaId: string, usuarioId: string) {
    // 1. Validar existencia de la emergencia
    const emergencia = await this.emergenciaRepo.findById(emergenciaId);
    if (!emergencia) {
      throw new Error('EMERGENCIA_NO_ENCONTRADA');
    }

    // 2. Verificar que no esté tomada o gestionada
    if (emergencia.estado !== EmergenciaEstado.SIN_GESTIONAR) {
      throw new Error('EMERGENCIA_YA_ASIGNADA');
    }

    // 3. Regla de negocio: El voluntario no puede tener otra emergencia activa (EN_CAMINO)
    const emergenciaActiva = await this.emergenciaRepo.findActivaByVoluntario(usuarioId);
    if (emergenciaActiva) {
      throw new Error('VOLUNTARIO_CON_EMERGENCIA_ACTIVA');
    }

    // 4. Regla de negocio: Si la prioridad es ROJO, requiere un certificado APROBADO
    if (emergencia.prioridad === Prioridad.ROJO) {
      const tieneCertificado = await this.emergenciaRepo.tieneCertificadoAprobado(usuarioId);
      if (!tieneCertificado) {
        throw new Error('REQUIERE_CERTIFICADO_APROBADO');
      }
    }

    // 5. Asignar la emergencia (con control de concurrencia en la transacción)
    const asignadaConExito = await this.emergenciaRepo.tomarEmergencia(emergenciaId, usuarioId);
    if (!asignadaConExito) {
      throw new Error('CONCURRENCIA_EMERGENCIA_TOMADA');
    }

    return {
      mensaje: 'Emergencia asignada exitosamente.',
      emergenciaId,
      estado: EmergenciaEstado.EN_CAMINO,
    };
  }
}