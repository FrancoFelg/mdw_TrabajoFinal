import { Rol, SolicitudAscensoEstado } from '@prisma/client';
import { SolicitudAscensoRepository } from '../repositories/solicitudAscenso.repository';

export class SolicitudAscensoService {
  private repo: SolicitudAscensoRepository;

  constructor() {
    this.repo = new SolicitudAscensoRepository();
  }

  async crear(usuarioId: string) {
    if (!usuarioId) {
      throw new Error('USUARIO_REQUERIDO');
    }

    const solicitudPendiente =
      await this.repo.findPendienteByUsuarioId(usuarioId);

    if (solicitudPendiente) {
      throw new Error('SOLICITUD_PENDIENTE_EXISTENTE');
    }

    return await this.repo.crear(usuarioId);
  }

  async listar() {
    return await this.repo.findAll();
  }

  async obtenerPorId(id: string) {
    const solicitud = await this.repo.findById(id);

    if (!solicitud) {
      throw new Error('SOLICITUD_NO_ENCONTRADA');
    }

    return solicitud;
  }

  async aprobar(id: string) {
    const solicitud = await this.obtenerPorId(id);

    if (solicitud.estado !== SolicitudAscensoEstado.PENDIENTE) {
      throw new Error('SOLICITUD_NO_PENDIENTE');
    }

    if (solicitud.usuario.rol === Rol.COORDINADOR) {
      throw new Error('USUARIO_YA_ES_COORDINADOR');
    }

    return await this.repo.aprobar(id, solicitud.usuarioId);
  }

  async rechazar(id: string) {
    const solicitud = await this.obtenerPorId(id);

    if (solicitud.estado !== SolicitudAscensoEstado.PENDIENTE) {
      throw new Error('SOLICITUD_NO_PENDIENTE');
    }

    return await this.repo.actualizarEstado(
      id,
      SolicitudAscensoEstado.RECHAZADO,
    );
  }
}