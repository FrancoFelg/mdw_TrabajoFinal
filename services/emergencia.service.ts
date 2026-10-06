import { z } from 'zod';
import { EmergenciaRepository } from '../repositories/emergencia.repository';
import { GeocodingService } from './geocoding.service';
import { ModoViaje, Punto, RutasService } from './rutas.service';
import { EmergenciaEstado, Prioridad, Provincia } from '@prisma/client';

// Body de POST /api/emergencias. La ubicación llega de una de dos formas:
//   - GPS: lat + lng + provincia
//   - Dirección manual: direccion (se geocodifica con Google Maps)
export const CrearEmergenciaSchema = z
  .object({
    descripcion: z.string().trim().min(5, 'La descripción debe tener al menos 5 caracteres.'),
    imagen: z.string().url('La imagen debe ser una URL válida.').optional(),
    direccion: z.string().trim().min(3, 'La dirección es demasiado corta.').optional(),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
    provincia: z.nativeEnum(Provincia).optional(),
  })
  .refine(
    (d) => d.direccion !== undefined || (d.lat !== undefined && d.lng !== undefined && d.provincia !== undefined),
    { message: 'Debe enviar una dirección, o lat + lng + provincia.' },
  );
export type CrearEmergenciaInput = z.infer<typeof CrearEmergenciaSchema>;

// Contrato de GET /api/emergencias: un punto listo para dibujar en un mapa
export interface EmergenciaMapa {
  id: string;
  descripcion: string;
  fecha: string; // ISO 8601
  prioridad: Prioridad;
  estado: EmergenciaEstado;
  provincia: Provincia;
  lat: number; // Ubicacion.coordenada_y
  lng: number; // Ubicacion.coordenada_x
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

  // Alta pública (sin login). Nace SIN_GESTIONAR y con prioridad VERDE.
  // Si llegan coordenadas de GPS se usan tal cual; si no, se geocodifica la dirección.
  async crear(datos: CrearEmergenciaInput) {
    const ubicacion =
      datos.lat !== undefined && datos.lng !== undefined && datos.provincia !== undefined
        ? { lat: datos.lat, lng: datos.lng, provincia: datos.provincia }
        : await this.geocoding.geocodificar(datos.direccion as string);

    const emergencia = await this.emergenciaRepo.crear({
      descripcion: datos.descripcion,
      imagen: datos.imagen,
      lat: ubicacion.lat,
      lng: ubicacion.lng,
      provincia: ubicacion.provincia,
    });

    return {
      id: emergencia.id,
      descripcion: emergencia.descripcion,
      fecha: emergencia.fecha.toISOString(),
      prioridad: emergencia.prioridad,
      estado: emergencia.estado,
      provincia: ubicacion.provincia,
      lat: ubicacion.lat,
      lng: ubicacion.lng,
      // Solo viene cuando se geocodificó: sirve para que el usuario confirme
      direccionFormateada: 'direccionFormateada' in ubicacion ? ubicacion.direccionFormateada : undefined,
    };
  }

  // Tiempo estimado de llegada desde la posición actual del voluntario
  // (la manda su dispositivo) hasta la emergencia.
  async calcularEta(emergenciaId: string, origen: Punto, modo?: ModoViaje) {
    const emergencia = await this.emergenciaRepo.findByIdConUbicacion(emergenciaId);
    if (!emergencia) {
      throw new Error('EMERGENCIA_NO_ENCONTRADA');
    }

    const { coordenada_x, coordenada_y } = emergencia.ubicacion;
    if (coordenada_x === null || coordenada_y === null) {
      throw new Error('EMERGENCIA_SIN_COORDENADAS');
    }

    const destino = { lat: coordenada_y, lng: coordenada_x };
    const ruta = await this.rutas.calcularRuta(origen, destino, modo);

    return {
      emergenciaId,
      estado: emergencia.estado,
      origen,
      destino,
      ...ruta,
      llegadaEstimada: new Date(Date.now() + ruta.duracionSegundos * 1000).toISOString(),
    };
  }

  // Emergencias activas listas para dibujar en el mapa.
  // Convención de Ubicacion: coordenada_x = longitud, coordenada_y = latitud.
  async listarParaMapa(): Promise<EmergenciaMapa[]> {
    const emergencias = await this.emergenciaRepo.findActivasConUbicacion();
    return emergencias.map((e) => ({
      id: e.id,
      descripcion: e.descripcion,
      fecha: e.fecha.toISOString(),
      prioridad: e.prioridad,
      estado: e.estado,
      provincia: e.ubicacion.provincia,
      lat: e.ubicacion.coordenada_y as number,
      lng: e.ubicacion.coordenada_x as number,
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