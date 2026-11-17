import { db } from '../config/database';
import { AtributoTipo, CertificadoAtributo } from '@prisma/client';
export interface CrearAtributoParametriaData {
  nombre: string;
  tipo?: AtributoTipo;
  usuarioCreacionId: string;
}

export class CertificadoAtributoRepository {
  async crear(data: CrearAtributoParametriaData): Promise<CertificadoAtributo> {
    return await db.certificadoAtributo.create({
      data: {
        nombre: data.nombre,
        tipo: data.tipo,
        usuarioCreacionId: data.usuarioCreacionId,
      },
    });
  }

  async findAll(): Promise<CertificadoAtributo[]> {
    return await db.certificadoAtributo.findMany({
      where: { fechaEliminacion: null },
    });
  }

  async findById(id: string): Promise<CertificadoAtributo | null> {
    return await db.certificadoAtributo.findFirst({
      where: { id, fechaEliminacion: null },
    });
  }
}