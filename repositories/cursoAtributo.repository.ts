import { db } from '../config/database';
import { AtributoTipo, CursosAtributos } from '@prisma/client';

export interface CrearCursoAtributoData {
  nombre: string;
  tipo?: AtributoTipo;
  usuarioCreacionId: string;
}

export class CursoAtributoRepository {
  async crear(data: CrearCursoAtributoData): Promise<CursosAtributos> {
    return await db.cursosAtributos.create({
      data: {
        nombre: data.nombre,
        tipo: data.tipo ?? AtributoTipo.TEXTO,
        usuarioCreacionId: data.usuarioCreacionId,
      },
    });
  }

  async findAll(): Promise<CursosAtributos[]> {
    return await db.cursosAtributos.findMany({
      where: { fechaEliminacion: null },
      orderBy: { nombre: 'asc' },
    });
  }

  async findById(id: string): Promise<CursosAtributos | null> {
    return await db.cursosAtributos.findFirst({
      where: { id, fechaEliminacion: null },
    });
  }

  async findByNombre(nombre: string): Promise<CursosAtributos | null> {
    return await db.cursosAtributos.findUnique({ where: { nombre } });
  }

  // Cuenta cuántos de los ids recibidos existen y están vigentes (para validar atributos de un curso).
  async contarVigentes(ids: string[]): Promise<number> {
    return await db.cursosAtributos.count({
      where: { id: { in: ids }, fechaEliminacion: null },
    });
  }

  // true si algún curso vigente tiene un valor cargado para este atributo.
  async estaEnUso(id: string): Promise<boolean> {
    const count = await db.cursosRelAtributos.count({
      where: { campoId: id, fechaEliminacion: null, curso: { fechaEliminacion: null } },
    });
    return count > 0;
  }

  async eliminar(id: string, usuarioEliminacionId: string): Promise<CursosAtributos> {
    return await db.cursosAtributos.update({
      where: { id },
      data: { fechaEliminacion: new Date(), usuarioEliminacionId },
    });
  }
}
