import { db } from '../config/database';
import { CertificadoEstado, Prisma } from '@prisma/client';

export interface AtributoValor {
  campoId: string;
  dato: string;
}

export interface CrearCertificadoData {
  usuarioId: string;
  nombre: string;
  entidadEmisora: string;
  fechaEmision: Date;
  codigoVerificacion: string | null;
  archivoTipo: string;
  archivoNombre: string;
  atributos: AtributoValor[];
}

export interface FiltroCertificadosRepo {
  usuarioId?: string;
  estado?: CertificadoEstado;
}

export type CambiosCertificado = Partial<{
  nombre: string;
  entidadEmisora: string;
  fechaEmision: Date;
  codigoVerificacion: string | null;
  archivoTipo: string;
  archivoNombre: string;
  estado: CertificadoEstado;
  motivoRechazo: string | null;
  fechaRevision: Date | null;
  usuarioRevisionId: string | null;
}>;

// Solo los datos adicionales (EAV) vigentes, con nombre y tipo del campo.
const includeDetalle = {
  certificadosRelAtributos: {
    where: { fechaEliminacion: null },
    include: { campos: true },
  },
} satisfies Prisma.CertificadoInclude;

export type CertificadoDetalle = Prisma.CertificadoGetPayload<{ include: typeof includeDetalle }>;

export class CertificadoRepository {
  // Crea la fila y sus atributos; `escribir` guarda el archivo dentro de la transacción,
  // así un fallo de disco revierte la fila.
  async crearConArchivo(data: CrearCertificadoData, escribir: (id: string) => Promise<void>): Promise<CertificadoDetalle> {
    return await db.$transaction(async (tx) => {
      const { atributos, ...troncal } = data;
      const creado = await tx.certificado.create({
        data: {
          ...troncal,
          estado: CertificadoEstado.PENDIENTE,
          usuarioCreacionId: data.usuarioId,
          certificadosRelAtributos: atributos.length
            ? { create: atributos.map((a) => ({ campoId: a.campoId, dato: a.dato, usuarioCreacionId: data.usuarioId })) }
            : undefined,
        },
        include: includeDetalle,
      });
      await escribir(creado.id);
      return creado;
    });
  }

  async findAll(filtro: FiltroCertificadosRepo = {}): Promise<CertificadoDetalle[]> {
    return await db.certificado.findMany({
      where: { fechaEliminacion: null, usuarioId: filtro.usuarioId, estado: filtro.estado },
      orderBy: { fechaCreacion: 'desc' },
      include: includeDetalle,
    });
  }

  async findById(id: string): Promise<CertificadoDetalle | null> {
    return await db.certificado.findFirst({
      where: { id, fechaEliminacion: null },
      include: includeDetalle,
    });
  }

  // `atributos`, si viene, reemplaza el set vigente. `escribir` reemplaza el archivo dentro de la transacción.
  // `condicion`: la escritura solo aplica si el certificado sigue en alguno de esos estados al momento
  // de escribir (si otra persona lo cambió después de leerlo, lanza `condicion.error`).
  async actualizar(
    id: string,
    cambios: CambiosCertificado,
    opciones: {
      atributos?: AtributoValor[];
      usuarioId?: string;
      escribir?: () => Promise<void>;
      condicion?: { estados: CertificadoEstado[]; error: string };
    } = {}
  ): Promise<CertificadoDetalle> {
    const { atributos, usuarioId, escribir, condicion } = opciones;
    return await db.$transaction(async (tx) => {
      const { count } = await tx.certificado.updateMany({
        where: { id, fechaEliminacion: null, ...(condicion ? { estado: { in: condicion.estados } } : {}) },
        data: cambios,
      });
      if (!count) throw new Error(condicion?.error ?? 'CERTIFICADO_NO_ENCONTRADO');

      if (atributos && usuarioId) {
        await tx.certificadosRelAtributos.updateMany({
          where: { certificadoId: id, fechaEliminacion: null },
          data: { fechaEliminacion: new Date(), usuarioEliminacionId: usuarioId },
        });
        // Por el @@unique([certificadoId, campoId]) se revive la fila existente en lugar de insertar otra.
        for (const attr of atributos) {
          await tx.certificadosRelAtributos.upsert({
            where: { certificadoId_campoId: { certificadoId: id, campoId: attr.campoId } },
            create: { certificadoId: id, campoId: attr.campoId, dato: attr.dato, usuarioCreacionId: usuarioId },
            update: {
              dato: attr.dato,
              fechaCreacion: new Date(),
              usuarioCreacionId: usuarioId,
              fechaEliminacion: null,
              usuarioEliminacionId: null,
            },
          });
        }
      }

      if (escribir) await escribir();
      return await tx.certificado.findUniqueOrThrow({ where: { id }, include: includeDetalle });
    });
  }

  // Baja lógica del certificado y de sus datos adicionales. El archivo se conserva.
  async eliminar(id: string, usuarioEliminacionId: string): Promise<void> {
    const ahora = new Date();
    await db.$transaction(async (tx) => {
      await tx.certificadosRelAtributos.updateMany({
        where: { certificadoId: id, fechaEliminacion: null },
        data: { fechaEliminacion: ahora, usuarioEliminacionId },
      });
      await tx.certificado.update({ where: { id }, data: { fechaEliminacion: ahora, usuarioEliminacionId } });
    });
  }
}
