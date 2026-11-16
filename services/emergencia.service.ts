import { z } from 'zod';
import { EmergenciaRepository } from '../repositories/emergencia.repository';
import { GeocodingService } from './geocoding.service';
import { ModoViaje, Punto, RutasService } from './rutas.service';
import { EmergenciaEstado, Prioridad, Provincia } from '@prisma/client';
import { db } from '../config/database';

// Evita consultar repetidamente direcciones pendientes durante el refresco del mapa.
let proximoIntentoUbicaciones = 0;
let ubicandoPendientes = false;
let desplazamientoPendientes = 0;

// Body de POST /api/emergencias. La ubicación llega de una de dos formas:
//   - GPS: coordenada_x + coordenada_y + provincia
//   - Dirección manual: direccion (se guarda sin depender de Google Maps)

const ERROR_X = 'coordenada_x (longitud) debe estar entre -180 y 180.';
const ERROR_Y = 'coordenada_y (latitud) debe estar entre -90 y 90.';

export const CrearEmergenciaSchema = z
  .object({
    descripcion: z.string().trim().min(5, 'La descripción debe tener al menos 5 caracteres.').max(191, 'La descripción admite hasta 191 caracteres.'),
    imagen: z.string().url('La imagen debe ser una URL válida.').max(191)
      .refine(url => /^https?:\/\//i.test(url), 'La imagen debe usar HTTP o HTTPS.').optional(),
    prioridad: z.nativeEnum(Prioridad, { message: 'La prioridad debe ser ROJO, AMARILLO o VERDE.' }).optional(),
    direccion: z.string().trim().min(3, 'La dirección es demasiado corta.').max(250).optional(),
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

export class EmergenciaService {
  private emergenciaRepo: EmergenciaRepository;
  private geocoding: GeocodingService;
  private rutas: RutasService;

  constructor() {
    this.emergenciaRepo = new EmergenciaRepository();
    this.geocoding = new GeocodingService();
    this.rutas = new RutasService();
  }

  // Alta de emergencia pública (no requiere cuenta). Nace SIN_GESTIONAR; la prioridad es la que
  // mande el cliente o VERDE por defecto.
  // Si llegan coordenadas de GPS se usan tal cual; si no, se intenta ubicar la dirección textual.
  async crear(datos: CrearEmergenciaInput, id?: string) {
    let coordenada_x: number | null = null;
    let coordenada_y: number | null = null;
    let provincia: Provincia | null = datos.provincia ?? null;
    let direccionFormateada: string | undefined;

    if (datos.coordenada_x !== undefined && datos.coordenada_y !== undefined && datos.provincia !== undefined) {
      coordenada_x = datos.coordenada_x;
      coordenada_y = datos.coordenada_y;
      provincia = datos.provincia;
    } else {
      // La dirección declarada permite registrar el caso sin depender de Google.
      // Las coordenadas quedan pendientes de verificar; nunca se inventan.
      direccionFormateada = datos.direccion;
      try {
        const lugar = await this.geocoding.geocodificar(datos.direccion!);
        coordenada_x = lugar.lng;
        coordenada_y = lugar.lat;
        provincia = lugar.provincia;
        direccionFormateada = lugar.direccionFormateada;
      } catch {
        // Sin Google o sin coincidencias, el reporte conserva la dirección textual.
      }
    }

    const emergencia = await this.emergenciaRepo.crear({
      id,
      descripcion: datos.descripcion,
      imagen: datos.imagen,
      prioridad: datos.prioridad ?? Prioridad.VERDE,
      coordenada_x,
      coordenada_y,
      provincia,
      direccion: datos.direccion,
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

  // Listar todas las emergencias
  async listarEmergencias() {
    const emergencias = await this.emergenciaRepo.findAll();
    if (ubicandoPendientes || Date.now() < proximoIntentoUbicaciones) return emergencias;
    const candidatos = emergencias.filter(e =>
      e.estado !== EmergenciaEstado.GESTIONADA && e.ubicacion.direccion &&
      (e.ubicacion.coordenada_x === null || e.ubicacion.coordenada_y === null),
    );
    const inicio = desplazamientoPendientes % Math.max(candidatos.length, 1);
    const pendientes = [...candidatos.slice(inicio), ...candidatos.slice(0, inicio)].slice(0, 5);
    desplazamientoPendientes = inicio + pendientes.length;
    if (!pendientes.length) return emergencias;
    ubicandoPendientes = true;
    proximoIntentoUbicaciones = Date.now() + 60_000;
    try {
      await Promise.all(pendientes.map(async e => {
        try {
          const lugar = await this.geocoding.geocodificar(e.ubicacion.direccion!);
          await db.ubicacion.updateMany({
            where: { id: e.ubicacion.id, OR: [{ coordenada_x: null }, { coordenada_y: null }] },
            data: { coordenada_x: lugar.lng, coordenada_y: lugar.lat, provincia: lugar.provincia },
          });
        } catch {
          // El caso permanece visible en la lista y se reintentará más adelante.
        }
      }));
      return await this.emergenciaRepo.findAll();
    } finally { ubicandoPendientes = false; }
  }

  // Obtener detalle de una emergencia
  async obtenerPorId(id: string) {
    const emergencia = await this.emergenciaRepo.findById(id);
    if (!emergencia) {
      throw new Error('EMERGENCIA_NO_ENCONTRADA');
    }
    return emergencia;
  }

  // Tomar la emergencia (con reglas de negocio y control de concurrencia)
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

  // Finalizar la emergencia
  async finalizarEmergencia(emergenciaId: string, usuarioId: string, observaciones?: string) {
    const emergencia = await this.emergenciaRepo.findById(emergenciaId);
    if (!emergencia) {
      throw new Error('EMERGENCIA_NO_ENCONTRADA');
    }

    if (emergencia.estado !== EmergenciaEstado.EN_CAMINO) {
      throw new Error('EMERGENCIA_NO_ESTA_EN_PROCESO');
    }

    // Validar que el voluntario que la finaliza sea quien la tiene asignada
    const esVoluntarioAsignado = emergencia.usuarios?.some(
      (relacion: any) => relacion.usuarioId === usuarioId
    );

    if (!esVoluntarioAsignado) {
      throw new Error('NO_ES_EL_VOLUNTARIO_ASIGNADO');
    }

    return await this.emergenciaRepo.finalizarEmergencia(emergenciaId);
  }
}
