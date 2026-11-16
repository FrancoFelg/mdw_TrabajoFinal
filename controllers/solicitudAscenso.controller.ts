import { SolicitudAscensoService } from '../services/solicitudAscenso.service';

export class SolicitudAscensoController {
  private service: SolicitudAscensoService;

  constructor() {
    this.service = new SolicitudAscensoService();
  }

  async crear(usuarioId: string) {
    return await this.service.crear(usuarioId);
  }

  async listar(usuarioId?: string) {
    return await this.service.listar(usuarioId);
  }

  async obtenerPorId(id: string) {
    return await this.service.obtenerPorId(id);
  }

  async aprobar(id: string, actorId?: string) {
    return await this.service.aprobar(id, actorId);
  }

  async rechazar(id: string, actorId?: string) {
    return await this.service.rechazar(id, actorId);
  }
}
