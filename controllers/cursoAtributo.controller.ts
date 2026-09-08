import { CursoAtributoService } from '../services/cursoAtributo.service';

export class CursoAtributoController {
  private service: CursoAtributoService;

  constructor() {
    this.service = new CursoAtributoService();
  }

  async crear(datos: { nombre?: string; tipo?: string }, usuarioCreacionId: string) {
    return await this.service.crear(datos, usuarioCreacionId);
  }

  async listar() {
    return await this.service.obtenerTodos();
  }

  async obtenerPorId(id: string) {
    return await this.service.obtenerPorId(id);
  }

  async eliminar(id: string, usuarioEliminacionId: string) {
    return await this.service.eliminar(id, usuarioEliminacionId);
  }
}
