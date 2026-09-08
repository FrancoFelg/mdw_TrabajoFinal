import { CursoInput, CursoService } from '../services/curso.service';

export class CursoController {
  private service: CursoService;

  constructor() {
    this.service = new CursoService();
  }

  async crear(datos: CursoInput, usuarioCreacionId: string) {
    return await this.service.crear(datos, usuarioCreacionId);
  }

  async listar() {
    return await this.service.listar();
  }

  async obtenerPorId(id: string) {
    return await this.service.obtenerPorId(id);
  }

  async actualizar(id: string, datos: CursoInput, usuarioId: string) {
    return await this.service.actualizar(id, datos, usuarioId);
  }

  async eliminar(id: string, usuarioEliminacionId: string) {
    return await this.service.eliminar(id, usuarioEliminacionId);
  }
}
