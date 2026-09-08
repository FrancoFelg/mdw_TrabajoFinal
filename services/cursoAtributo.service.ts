import { AtributoTipo } from '@prisma/client';
import { CrearCursoAtributoData, CursoAtributoRepository } from '../repositories/cursoAtributo.repository';

export class CursoAtributoService {
  private repo: CursoAtributoRepository;

  constructor() {
    this.repo = new CursoAtributoRepository();
  }

  async crear(data: { nombre?: string; tipo?: string }, usuarioCreacionId: string) {
    if (!usuarioCreacionId) {
      throw new Error('USUARIO_CREACION_REQUERIDO');
    }
    const nombre = data.nombre?.trim();
    if (!nombre) {
      throw new Error('EL_NOMBRE_ES_REQUERIDO');
    }
    if (data.tipo !== undefined && !Object.values(AtributoTipo).includes(data.tipo as AtributoTipo)) {
      throw new Error('TIPO_INVALIDO');
    }

    const existente = await this.repo.findByNombre(nombre);
    if (existente) {
      throw new Error('ATRIBUTO_EXISTENTE');
    }

    const payload: CrearCursoAtributoData = {
      nombre,
      tipo: data.tipo as AtributoTipo | undefined,
      usuarioCreacionId,
    };
    return await this.repo.crear(payload);
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

  async eliminar(id: string, usuarioEliminacionId: string) {
    if (!usuarioEliminacionId) {
      throw new Error('USUARIO_ELIMINACION_REQUERIDO');
    }
    await this.obtenerPorId(id);
    if (await this.repo.estaEnUso(id)) {
      throw new Error('ATRIBUTO_EN_USO');
    }
    return await this.repo.eliminar(id, usuarioEliminacionId);
  }
}
