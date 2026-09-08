import { CertificadoAtributoService } from '../services/certificadoAtributo.service';
import { CrearAtributoParametriaData } from '../repositories/certificadoAtributo.repository';

export class CertificadoAtributoController {
  private service: CertificadoAtributoService;

  constructor() {
    this.service = new CertificadoAtributoService();
  }

  async crear(datos: CrearAtributoParametriaData) {
    return await this.service.crear(datos);
  }

  async listar() {
    return await this.service.obtenerTodos();
  }

  async obtenerPorId(id: string) {
    return await this.service.obtenerPorId(id);
  }
}