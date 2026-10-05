import { EmergenciaRepository, CrearEmergenciaDTO } from '../repositories/emergencia.repository';
import { EmergenciaEstado, Prioridad } from '@prisma/client';

export class EmergenciaService {
  private emergenciaRepo: EmergenciaRepository;

  constructor() {
    this.emergenciaRepo = new EmergenciaRepository();
  }

  // Crear una nueva emergencia
  async crearEmergencia(data: CrearEmergenciaDTO) {
    // Validar datos obligatorios según el schema
    if (!data.descripcion || !data.prioridad || !data.fecha || !data.provincia) {
      throw new Error('DATOS_INCOMPLETOS');
    }

    return await this.emergenciaRepo.crear(data);
  }

  // Listar todas las emergencias
  async listarEmergencias() {
    return await this.emergenciaRepo.findAll();
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