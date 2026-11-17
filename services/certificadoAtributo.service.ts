import { AtributoTipo } from '@prisma/client';
import { CertificadoAtributoRepository } from '../repositories/certificadoAtributo.repository';
export class CertificadoAtributoService {
  private repo: CertificadoAtributoRepository;

  constructor() {
    this.repo = new CertificadoAtributoRepository();
  }

  async crear(data: { nombre: string; tipo?: string; usuarioCreacionId: string }) {
    const nombre = data.nombre?.trim();
    if (!nombre) {
      throw new Error('EL_NOMBRE_ES_REQUERIDO');
    }
    if (!data.usuarioCreacionId) {
      throw new Error('USUARIO_CREACION_REQUERIDO');
    }
    if (data.tipo !== undefined && !Object.values(AtributoTipo).includes(data.tipo as AtributoTipo)) {
      throw new Error('TIPO_INVALIDO');
    }

    return await this.repo.crear({ nombre, tipo: data.tipo as AtributoTipo | undefined, usuarioCreacionId: data.usuarioCreacionId });
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