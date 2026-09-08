import { SolicitudAscensoService } from '../services/solicitudAscenso.service';

export class SolicitudAscensoController {
  private service: SolicitudAscensoService;

  constructor() {
    this.service = new SolicitudAscensoService();
  }

  async crear(usuarioId: string) {
    return await this.service.crear(usuarioId);
  }

  async listar() {
    return await this.service.listar();
  }

  async obtenerPorId(id: string) {
    return await this.service.obtenerPorId(id);
  }

  async aprobar(id: string) {
    return await this.service.aprobar(id);
  }

  async rechazar(id: string) {
    return await this.service.rechazar(id);
  }
}