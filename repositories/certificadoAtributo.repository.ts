import { db } from '../config/database';
import { CertificadoAtributo } from '@prisma/client';
export interface CrearAtributoParametriaData {
  nombre: string;
  usuarioCreacionId: string;
}

export class CertificadoAtributoRepository {
  async crear(data: CrearAtributoParametriaData): Promise<CertificadoAtributo> {
    return await db.certificadoAtributo.create({
      data: {
        nombre: data.nombre,
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