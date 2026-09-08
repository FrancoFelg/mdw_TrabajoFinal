import { db } from '../config/database';
import { Certificado, CertificadoEstado } from '@prisma/client';

export interface AtributoValorInput {
  campoId: string;
  valor: string;
  fechaHasta?: Date;
}

export interface CrearCertificadoConAtributosData {
  cursoId: string;
  estadoId: string;
  estado: CertificadoEstado;
  usuarioId: string;
  codigoVerificacion: string;
  usuarioCreacionId: string;
  atributos?: AtributoValorInput[];
}

export interface ActualizarCertificadoData {
  estadoId?: string;
  estado?: CertificadoEstado;
  codigoVerificacion?: string;
}

export class CertificadoRepository {
  async crearConAtributos(data: CrearCertificadoConAtributosData): Promise<Certificado> {
    return await db.certificado.create({
      data: {
        cursoId: data.cursoId,
        estadoId: data.estadoId,
        estado: data.estado,
        usuarioId: data.usuarioId,
        codigoVerificacion: data.codigoVerificacion,
        usuarioCreacionId: data.usuarioCreacionId,
        certificadosRelAtributos: data.atributos?.length
          ? {
              create: data.atributos.map((attr) => ({
                campoId: attr.campoId,
                valor: attr.valor,
                fechaHasta: attr.fechaHasta,
                usuarioCreacionId: data.usuarioCreacionId,
              })),
            }
          : undefined,
      },
      include: {
        certificadosRelAtributos: {
          where: { fechaEliminacion: null },
          include: {
            campos: true,
          },
        },
      },
    });
  }

  async findAll() {
    return await db.certificado.findMany({
      where: { fechaEliminacion: null },
      include: {
        curso: true,
        usuario: {
          include: { persona: true },
        },
        certificadosRelAtributos: {
          where: { fechaEliminacion: null },
          include: {
            campos: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return await db.certificado.findFirst({
      where: {
        id,
        fechaEliminacion: null,
      },
      include: {
        curso: true,
        usuario: {
          include: { persona: true },
        },
        certificadosRelAtributos: {
          where: { fechaEliminacion: null },
          include: {
            campos: true,
          },
        },
      },
    });
  }

  async actualizar(id: string, data: ActualizarCertificadoData) {
    return await db.certificado.update({
      where: { id },
      data,
      include: {
        certificadosRelAtributos: {
          where: { fechaEliminacion: null },
          include: {
            campos: true,
          },
        },
      },
    });
  }

  async eliminar(id: string, usuarioEliminacionId: string) {
    return await db.certificado.update({
      where: { id },
      data: {
        fechaEliminacion: new Date(),
        usuarioEliminacionId,
      },
    });
  }
}