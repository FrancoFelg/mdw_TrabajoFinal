import { db } from '../config/database';
import { Certificado, CertificadoEstado } from '@prisma/client';
import { usuarioPublicoSelect } from '../src/lib/usuario-publico';

export interface AtributoValorInput {
  campoId: string;
  dato: string;
  fechaHasta?: Date;
}

export interface CrearCertificadoConAtributosData {
  cursoId?: string;
  archivo?: string;
  estado: CertificadoEstado;
  usuarioId: string;
  codigoVerificacion: string;
  usuarioCreacionId: string;
  atributos?: AtributoValorInput[];
}

export interface ActualizarCertificadoData {
  estado?: CertificadoEstado;
  codigoVerificacion?: string;
}

export class CertificadoRepository {
  async crearConAtributos(data: CrearCertificadoConAtributosData): Promise<Certificado> {
    return await db.certificado.create({
      data: {
        cursoId: data.cursoId,
        archivo: data.archivo,
        estado: data.estado,
        usuarioId: data.usuarioId,
        codigoVerificacion: data.codigoVerificacion,
        usuarioCreacionId: data.usuarioCreacionId,
        certificadosRelAtributos: data.atributos?.length
          ? {
              create: data.atributos.map((attr) => ({
                campoId: attr.campoId,
                // La columna en el schema se llama `dato`; `valor` es el nombre del contrato de la API
                dato: String(attr.dato),
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

  // Con usuarioId devuelve solo los certificados de ese usuario
  async findAll(usuarioId?: string) {
    return await db.certificado.findMany({
      where: { fechaEliminacion: null, usuarioId },
      include: {
        curso: true,
        usuario: {
          select: { ...usuarioPublicoSelect, persona: true },
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
          select: { ...usuarioPublicoSelect, persona: true },
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
