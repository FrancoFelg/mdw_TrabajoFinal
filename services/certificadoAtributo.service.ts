import {
  CertificadoAtributoRepository,
  CrearAtributoParametriaData,
} from '../repositories/certificadoAtributo.repository';
export class CertificadoAtributoService {
  private repo: CertificadoAtributoRepository;

  constructor() {
    this.repo = new CertificadoAtributoRepository();
  }

  async crear(data: CrearAtributoParametriaData) {
    if (!data.nombre || data.nombre.trim() === '') {
      throw new Error('EL_NOMBRE_ES_REQUERIDO');
    }
    if (!data.usuarioCreacionId) {
      throw new Error('USUARIO_CREACION_REQUERIDO');
    }

    return await this.repo.crear(data);
  }

  async obtenerTodos() {
    return await this.repo.findAll();
  }

  async obtenerPorId(id: string) {
    const atributo = await this.repo.findById(id);
    if (!atributo) {
      throw new Error('ATRIBUTO_NO_ENCONTRADO');
    }
    return atributo;
  }
}